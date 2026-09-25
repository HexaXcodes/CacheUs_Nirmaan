// services/sessionEngine.js
// Shared logic for applying a step-verification result (from either the real
// /api/ml/verification endpoint or the /api/ml/mock dev endpoint) to a
// ProcedureSession. Keeping this in one place means the ML contract behaves
// identically regardless of which endpoint produced the result.
const { resolveWorkflow } = require('./workflowConfig');

const VALID_STATUSES = ['correct', 'incorrect', 'uncertain'];

function validateVerificationPayload(body) {
  const errors = [];
  const { workflowId, sessionId, stepId, status, confidence, perception } = body;

  if (!workflowId) errors.push('workflowId is required');
  if (!sessionId) errors.push('sessionId is required');
  if (!stepId) errors.push('stepId is required');
  if (!status || !VALID_STATUSES.includes(status))
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1))
    errors.push('confidence must be a number between 0 and 1');
  if (perception !== undefined) {
    if (typeof perception !== 'object' || perception === null)
      errors.push('perception must be an object');
    else {
      if (perception.objects !== undefined && !Array.isArray(perception.objects))
        errors.push('perception.objects must be an array');
      if (perception.landmarks !== undefined && !Array.isArray(perception.landmarks))
        errors.push('perception.landmarks must be an array');
      if (perception.boundingBoxes !== undefined && !Array.isArray(perception.boundingBoxes))
        errors.push('perception.boundingBoxes must be an array');
    }
  }

  return errors;
}

// Applies a validated verification result to a session document (does not save).
// Returns { nextStep, workflowComplete }.
function applyStepResult(session, { stepId, status, confidence, errorCode, perception, timestamp, mock }) {
  const resolved = resolveWorkflow(session.workflowId, session.device);
  const steps = resolved.steps || [];
  const stepIndex = steps.findIndex((s) => s.id === stepId);

  const priorAttempts = session.stepResults.filter((r) => r.stepId === stepId).length;

  session.stepResults.push({
    stepId,
    status,
    confidence,
    errorCode,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    attempts: priorAttempts + 1,
    metadata: { perception: perception || null, mock: !!mock }
  });

  let nextStep = null;
  let workflowComplete = false;

  if (status === 'correct' && stepIndex !== -1) {
    const configuredNext = steps[stepIndex].nextStep;
    nextStep = configuredNext || (steps[stepIndex + 1] ? steps[stepIndex + 1].id : null);
    if (nextStep) {
      session.currentStep = nextStep;
    } else {
      workflowComplete = true;
      session.status = 'completed';
      session.completedAt = new Date();
    }
  } else {
    // incorrect/uncertain: stay on the same step so the user can retry
    session.currentStep = stepId;
  }

  return { nextStep, workflowComplete };
}

module.exports = { validateVerificationPayload, applyStepResult, VALID_STATUSES };
