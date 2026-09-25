// controllers/aiController.js
// Coaching/explanation endpoints only. See services/llmService.js for the
// guardrails that keep this from ever diagnosing, prescribing, or dosing.
const { explainStep, explainWorkflow } = require('../services/llmService');
const { getWorkflowRaw, resolveWorkflow, getStep } = require('../services/workflowConfig');
const asyncHandler = require('../middleware/asyncHandler');

// POST /api/ai/explain
// body: { workflowId, stepId, language }
exports.explain = asyncHandler(async (req, res) => {
  const { workflowId, stepId, language, device } = req.body;
  if (!workflowId || !stepId)
    return res.status(400).json({ error: 'workflowId and stepId are required' });

  const wf = getWorkflowRaw(workflowId);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  if (!wf.supported) {
    return res.json({
      explanation:
        'NovaCare cannot safely guide this situation. Please consult a qualified healthcare professional.'
    });
  }

  const step = getStep(workflowId, stepId, device);
  if (!step) return res.status(404).json({ error: 'Step not found for this workflow' });

  const userMedicalInfo = req.user ? req.user.medicalInfo : null;

  const result = await explainStep({
    workflow: wf,
    step,
    language: language || 'en',
    userMedicalInfo
  });
  res.json(result);
});

// POST /api/ai/summary
// body: { workflowId, language }
exports.summary = asyncHandler(async (req, res) => {
  const { workflowId, language } = req.body;
  if (!workflowId) return res.status(400).json({ error: 'workflowId is required' });

  const wf = getWorkflowRaw(workflowId);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  if (!wf.supported) {
    return res.json({
      explanation:
        'NovaCare cannot safely guide this situation. Please consult a qualified healthcare professional.'
    });
  }

  const result = await explainWorkflow({ workflow: wf, language: language || 'en' });
  res.json(result);
});
