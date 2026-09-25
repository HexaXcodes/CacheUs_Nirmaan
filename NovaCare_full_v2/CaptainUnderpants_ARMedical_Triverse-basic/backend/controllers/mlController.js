// controllers/mlController.js
// Clean contract for the (separately developed) ML perception service.
// This controller does NOT run any medical intelligence itself — it validates
// the shape of what the ML layer reports, applies it to the session's
// deterministic workflow state machine, and returns the resulting coaching
// state. See services/sessionEngine.js for the shared apply logic.
const asyncHandler = require('../middleware/asyncHandler');
const ProcedureSession = require('../models/ProcedureSession');
const { validateVerificationPayload, applyStepResult } = require('../services/sessionEngine');
const { resolveWorkflow } = require('../services/workflowConfig');
const { predictInhalerStep } = require('../services/inhalerMlClient');
const { pushPrediction, clearSession: clearSmoothingHistory } = require('../services/inhalerTemporalSmoothing');

async function handleVerification(req, res, { mock }) {
  const errors = validateVerificationPayload(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { sessionId, workflowId, stepId, status, confidence, errorCode, perception, timestamp } = req.body;

  const session = await ProcedureSession.findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (String(session.user) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not authorized to access this session' });
  }
  if (session.workflowId !== workflowId) {
    return res.status(400).json({ error: 'workflowId does not match this session' });
  }
  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: `Session is '${session.status}', cannot record steps` });
  }

  const { nextStep, workflowComplete } = applyStepResult(session, {
    stepId,
    status,
    confidence,
    errorCode,
    perception,
    timestamp,
    mock
  });

  await session.save();

  res.json({
    mock: !!mock,
    sessionId: session._id,
    stepId,
    status,
    nextStep,
    workflowComplete,
    session
  });
}

// POST /api/ml/verification
// Real perception-service contract. The ML model itself is implemented
// elsewhere; this endpoint only accepts and records its structured output.
exports.verify = asyncHandler(async (req, res) => handleVerification(req, res, { mock: false }));

// POST /api/ml/mock
// DEV/DEMO ONLY — lets the frontend simulate correct/incorrect/uncertain
// without a real ML model attached. Every result is tagged mock:true so it
// can never be confused with a real, medically-validated verification.
exports.mockVerify = asyncHandler(async (req, res) => {
  if (process.env.ENABLE_MOCK_ML === 'false') {
    return res.status(403).json({ error: 'Mock ML endpoint is disabled in this environment' });
  }
  return handleVerification(req, res, { mock: true });
});

// POST /api/ml/inhaler/predict
// Proxies a 20-frame window to the internal Python frame-classifier service
// (see ../../ml-service), applies window-level temporal smoothing
// (inhalerTemporalSmoothing.js), and — once settled — turns the predicted
// step into a verdict by comparing it against the session's own
// currentStep. This endpoint does NOT touch the session's stored state
// itself; it only computes and returns the same {status, confidence,
// errorCode, perception} fields /api/ml/verification's request body already
// takes. The frontend submits that through the EXISTING submitVerification
// path (POST /api/ml/verification), which stays the one and only place any
// workflow's session actually gets mutated — no parallel contract, no
// special-casing in the session state machine for inhaler.
//
// The model only ever learned "which of 8 steps is this", never "was this
// step done correctly" (see docs/PHASE_1_ML_INTEGRATION.md — the training
// data has zero incorrect-technique examples). So the verdict is derived
// entirely by comparing the settled predicted step against the session's
// own currentStep:
//   predicted === expected            -> correct
//   predicted resolves to a different known step (out of order)
//                                      -> incorrect
//   low confidence, or not yet settled -> uncertain
//
// Raised from 0.4 -> 0.9 as an out-of-distribution rejection layer, evidence-
// based, not guessed: live testing on remove_cap with NO inhaler in frame
// (see docs/PHASE_1_ML_INTEGRATION.md) produced smoothed confidences of
// 78.2%, 81.7%, 84.3% across three separate failed settles — all comfortably
// above the old 0.4 bar, all comfortably below the ~98-100% this same model
// scores on its own training data when genuinely correct. 0.9 sits in that
// gap. This addresses "forced 8-way choice, no reject option" specifically —
// it does NOT address a class the model is confidently wrong about (see
// exhale_away/position_mouthpiece, which settled at 90-98%, well above this
// bar, and would NOT be caught by it).
const LOW_CONFIDENCE_THRESHOLD = 0.9;

exports.inhalerPredict = asyncHandler(async (req, res) => {
  const { sessionId, workflowId, frames } = req.body;

  if (workflowId !== 'inhaler_technique') {
    return res.status(400).json({ error: "This endpoint only serves workflowId 'inhaler_technique'" });
  }
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  if (!Array.isArray(frames) || frames.length !== 20) {
    return res.status(400).json({ error: 'frames must be an array of exactly 20 base64-encoded images' });
  }

  const session = await ProcedureSession.findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (String(session.user) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not authorized to access this session' });
  }
  if (session.workflowId !== workflowId) {
    return res.status(400).json({ error: 'workflowId does not match this session' });
  }
  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: `Session is '${session.status}', cannot record steps` });
  }

  let prediction;
  try {
    prediction = await predictInhalerStep(frames);
  } catch (err) {
    return res.status(502).json({ error: `Inhaler ML service unavailable: ${err.message}` });
  }

  const smoothed = pushPrediction(String(session._id), prediction.stepLabel, prediction.confidence);

  // Diagnostic logging (temporary — remove once the "everything passes"
  // report is resolved). Prints the raw per-window read and, once settled,
  // the exact expected-vs-predicted comparison mlController makes below.
  // Also prints the runner-up class + probability margin — not used by the
  // 0.9 max-probability rejection above, but needed if a margin-based
  // rejection (option b) ever needs evaluating against real numbers instead
  // of a guess, the same way the 0.9 threshold above was.
  const sortedProbs = Object.entries(prediction.probabilities || {}).sort((a, b) => b[1] - a[1]);
  const runnerUp = sortedProbs[1];
  console.log(
    `[inhalerPredict] session=${session._id} raw=${prediction.stepLabel}@${(prediction.confidence * 100).toFixed(1)}% ` +
    `runnerUp=${runnerUp ? `${runnerUp[0]}@${(runnerUp[1] * 100).toFixed(1)}%` : 'n/a'} ` +
    `settled=${smoothed.settled}${smoothed.settled ? ` smoothedLabel=${smoothed.label}@${(smoothed.confidence * 100).toFixed(1)}% currentStep=${session.currentStep}` : ''}`
  );

  if (!smoothed.settled) {
    // Still gathering evidence across the sliding window — not a verdict
    // yet, nothing to submit.
    return res.json({ settled: false, rawPrediction: prediction });
  }

  // Settled. Clear the smoothing history immediately so the NEXT verdict
  // (whatever it turns out to be) requires fresh evidence rather than
  // re-firing every subsequent call from the same stale window majority.
  clearSmoothingHistory(String(session._id));

  const expectedStepId = session.currentStep;
  const resolved = resolveWorkflow(workflowId, session.device);
  const steps = resolved.steps || [];
  const predictedIsKnownStep = steps.some((s) => s.id === smoothed.label);

  let status;
  let errorCode;

  if (smoothed.confidence < LOW_CONFIDENCE_THRESHOLD) {
    status = 'uncertain';
  } else if (smoothed.label === expectedStepId) {
    status = 'correct';
  } else if (predictedIsKnownStep) {
    status = 'incorrect';
    const expectedIndex = steps.findIndex((s) => s.id === expectedStepId);
    const predictedIndex = steps.findIndex((s) => s.id === smoothed.label);
    errorCode = predictedIndex > expectedIndex ? 'step_skipped_ahead' : 'step_out_of_order';
  } else {
    // Predicted a step id this device variant doesn't have (shouldn't
    // normally happen — CLASSES is a fixed 8-item list — but stay honest
    // rather than silently treating it as correct or incorrect).
    status = 'uncertain';
  }

  console.log(
    `[inhalerPredict] SETTLED session=${session._id} expectedStepId=${expectedStepId} ` +
    `smoothedLabel=${smoothed.label} -> status=${status}${errorCode ? ` errorCode=${errorCode}` : ''}`
  );

  res.json({
    settled: true,
    workflowId,
    sessionId: session._id,
    stepId: expectedStepId,
    status,
    confidence: smoothed.confidence,
    errorCode,
    rawPrediction: prediction, // this call's individual window read — same shape as the unsettled response
    predictedLabel: smoothed.label, // the SETTLED majority label across the smoothing window (may differ from rawPrediction.stepLabel)
    perception: { objects: [], landmarks: [], boundingBoxes: [], modelPrediction: prediction }
  });
});
