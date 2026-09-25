// controllers/sessionController.js
const asyncHandler = require('../middleware/asyncHandler');
const ProcedureSession = require('../models/ProcedureSession');
const { getWorkflowRaw, resolveWorkflow } = require('../services/workflowConfig');
const { validateVerificationPayload, applyStepResult } = require('../services/sessionEngine');

const UNSUPPORTED_MESSAGE =
  'NovaCare cannot safely guide this situation. Please consult a qualified healthcare professional.';

// Ensures the session exists AND belongs to req.user. Returns the doc or null
// (and has already sent a response) if not.
async function loadOwnedSession(req, res) {
  const session = await ProcedureSession.findById(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return null;
  }
  if (String(session.user) !== String(req.user._id)) {
    res.status(403).json({ error: 'Not authorized to access this session' });
    return null;
  }
  return session;
}

// POST /api/sessions
exports.createSession = asyncHandler(async (req, res) => {
  const { workflowId, device } = req.body;
  if (!workflowId) return res.status(400).json({ error: 'workflowId is required' });

  const wf = getWorkflowRaw(workflowId);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  if (!wf.supported) {
    const session = await ProcedureSession.create({
      user: req.user._id,
      workflowId,
      status: 'unsupported'
    });
    return res.status(201).json({ session, message: UNSUPPORTED_MESSAGE });
  }

  const resolved = resolveWorkflow(workflowId, device);
  if (resolved.error === 'invalid_device') {
    return res.status(400).json({
      error: `Unknown device type '${device}' for this workflow`,
      deviceTypes: resolved.deviceTypes
    });
  }

  const firstStep = resolved.steps && resolved.steps[0] ? resolved.steps[0].id : null;

  const session = await ProcedureSession.create({
    user: req.user._id,
    workflowId,
    device: resolved.device,
    currentStep: firstStep,
    status: 'in_progress'
  });

  res.status(201).json({ session, currentStep: firstStep, workflow: resolved });
});

// GET /api/sessions/:id
exports.getSession = asyncHandler(async (req, res) => {
  const session = await loadOwnedSession(req, res);
  if (!session) return;
  res.json(session);
});

// GET /api/sessions  (a user's own session history)
exports.listSessions = asyncHandler(async (req, res) => {
  const sessions = await ProcedureSession.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(sessions);
});

// PUT /api/sessions/:id
exports.updateSession = asyncHandler(async (req, res) => {
  const session = await loadOwnedSession(req, res);
  if (!session) return;

  const allowed = ['status', 'currentStep'];
  for (const k of allowed) if (req.body[k] !== undefined) session[k] = req.body[k];
  if (req.body.status === 'abandoned' && !session.completedAt) session.completedAt = new Date();

  await session.save();
  res.json(session);
});

// POST /api/sessions/:id/steps
// Records a step result directly against a session (used by the frontend/AR
// layer once it already has a verification result — e.g. relayed from
// /api/ml/verification, or for manual-verification steps).
exports.addStepResult = asyncHandler(async (req, res) => {
  const session = await loadOwnedSession(req, res);
  if (!session) return;

  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: `Session is '${session.status}', cannot record steps` });
  }

  const errors = validateVerificationPayload({ ...req.body, workflowId: session.workflowId, sessionId: session._id.toString() });
  if (errors.length) return res.status(400).json({ errors });

  const { stepId, status, confidence, errorCode, perception, timestamp } = req.body;
  const { nextStep, workflowComplete } = applyStepResult(session, {
    stepId,
    status,
    confidence,
    errorCode,
    perception,
    timestamp
  });

  await session.save();
  res.json({ session, nextStep, workflowComplete });
});

// POST /api/sessions/:id/complete
exports.completeSession = asyncHandler(async (req, res) => {
  const session = await loadOwnedSession(req, res);
  if (!session) return;

  session.status = 'completed';
  session.completedAt = new Date();
  await session.save();
  res.json(session);
});
