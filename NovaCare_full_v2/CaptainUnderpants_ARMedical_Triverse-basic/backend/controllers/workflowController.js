// controllers/workflowController.js
const asyncHandler = require('../middleware/asyncHandler');
const { cache } = require('../services/cache');
const { listWorkflows, resolveWorkflow } = require('../services/workflowConfig');

// GET /api/workflows
exports.listWorkflows = asyncHandler(async (req, res) => {
  const cacheKey = 'workflows:list';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const list = listWorkflows();
  cache.set(cacheKey, list, 86400); // 24h — workflow definitions rarely change
  res.json(list);
});

// GET /api/workflows/:id?device=mdi
exports.getWorkflow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { device } = req.query;

  const cacheKey = `workflows:${id}:${device || 'default'}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const resolved = resolveWorkflow(id, device);
  if (resolved.error === 'not_found') {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  if (resolved.error === 'invalid_device') {
    return res.status(400).json({
      error: `Unknown device type '${device}' for this workflow`,
      deviceTypes: resolved.deviceTypes
    });
  }

  if (!resolved.supported) {
    return res.status(200).json({
      workflowId: id,
      supported: false,
      message:
        'NovaCare cannot safely guide this situation. Please consult a qualified healthcare professional.'
    });
  }

  cache.set(cacheKey, resolved, 86400);
  res.json(resolved);
});
