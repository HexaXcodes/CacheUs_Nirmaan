// src/services/aiService.js
import { apiFetch } from './api';

export const aiService = {
  // Coaching for a single workflow step, in the requested language.
  explainStep: ({ workflowId, stepId, language, device }) =>
    apiFetch('/ai/explain', { method: 'POST', body: { workflowId, stepId, language, device } }),

  // High-level overview of a whole workflow.
  summary: ({ workflowId, language }) =>
    apiFetch('/ai/summary', { method: 'POST', body: { workflowId, language } })
};
