// src/services/workflowService.js
// Generic six-phase workflow config — the same shape drives every phase
// (inhaler, BP, insulin, glucose, medication delivery, home procedures), so
// this service and its callers never branch per-workflow.
import { apiFetch } from './api';

export const workflowService = {
  list: () => apiFetch('/workflows', { withAuth: false }),

  // device is only meaningful for workflows with deviceVariants (e.g. inhaler)
  get: (id, device) =>
    apiFetch(`/workflows/${id}${device ? `?device=${encodeURIComponent(device)}` : ''}`, {
      withAuth: false
    })
};
