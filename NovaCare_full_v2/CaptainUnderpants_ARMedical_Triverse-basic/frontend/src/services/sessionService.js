// src/services/sessionService.js
// Procedure sessions — one per attempt at a workflow. Steps are recorded
// either directly (manual verificationMode) or relayed from the ML contract
// (see mlService.js), which internally hits the same session record.
import { apiFetch } from './api';

export const sessionService = {
  list: () => apiFetch('/sessions'),

  create: ({ workflowId, device }) =>
    apiFetch('/sessions', { method: 'POST', body: { workflowId, device } }),

  get: (id) => apiFetch(`/sessions/${id}`),

  update: (id, patch) => apiFetch(`/sessions/${id}`, { method: 'PUT', body: patch }),

  addStepResult: (id, result) =>
    apiFetch(`/sessions/${id}/steps`, { method: 'POST', body: result }),

  complete: (id) => apiFetch(`/sessions/${id}/complete`, { method: 'POST' })
};
