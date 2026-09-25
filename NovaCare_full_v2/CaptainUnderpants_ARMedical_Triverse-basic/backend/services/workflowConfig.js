// services/workflowConfig.js
// Loads and reads the generic workflow definitions from data/workflows.json.
// This is the ONLY place that knows about the on-disk config shape — adding a
// 7th (or 8th...) workflow means editing the JSON file, not this code or any
// controller.
const path = require('path');
const fs = require('fs');

const workflowsPath = path.join(__dirname, '..', 'data', 'workflows.json');
let workflows = JSON.parse(fs.readFileSync(workflowsPath, 'utf-8'));

// Re-read from disk (handy in dev if the JSON is hand-edited without a restart)
function reload() {
  workflows = JSON.parse(fs.readFileSync(workflowsPath, 'utf-8'));
  return workflows;
}

function listWorkflows() {
  return Object.values(workflows).map((w) => ({
    id: w.id,
    phase: w.phase,
    category: w.category,
    name: w.name,
    description: w.description,
    supported: w.supported,
    requiresML: w.requiresML,
    requiresAR: w.requiresAR,
    deviceTypes: w.deviceTypes || undefined
  }));
}

function getWorkflowRaw(workflowId) {
  return workflows[workflowId] || null;
}

// Resolves a workflow to its effective step list, handling device-specific
// variants generically (any workflow MAY define `deviceVariants` — no
// per-workflow branching logic here).
function resolveWorkflow(workflowId, device) {
  const wf = workflows[workflowId];
  if (!wf) return { error: 'not_found' };

  if (wf.deviceVariants) {
    const deviceTypes = wf.deviceTypes || Object.keys(wf.deviceVariants);
    const chosen = device || deviceTypes[0];
    const variant = wf.deviceVariants[chosen];
    if (!variant) {
      return { error: 'invalid_device', deviceTypes };
    }
    return {
      id: wf.id,
      phase: wf.phase,
      category: wf.category,
      name: wf.name,
      description: wf.description,
      supported: wf.supported,
      requiresML: wf.requiresML,
      requiresAR: wf.requiresAR,
      medicalBoundary: wf.medicalBoundary,
      device: chosen,
      deviceLabel: variant.label,
      steps: variant.steps
    };
  }

  return {
    id: wf.id,
    phase: wf.phase,
    category: wf.category,
    name: wf.name,
    description: wf.description,
    supported: wf.supported,
    requiresML: wf.requiresML,
    requiresAR: wf.requiresAR,
    medicalBoundary: wf.medicalBoundary,
    steps: wf.steps
  };
}

function getStep(workflowId, stepId, device) {
  const resolved = resolveWorkflow(workflowId, device);
  if (resolved.error) return null;
  return (resolved.steps || []).find((s) => s.id === stepId) || null;
}

module.exports = { listWorkflows, getWorkflowRaw, resolveWorkflow, getStep, reload };
