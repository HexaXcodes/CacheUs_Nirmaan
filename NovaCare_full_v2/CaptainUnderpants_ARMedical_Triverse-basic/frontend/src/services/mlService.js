// src/services/mlService.js
// Standardized ML verification contract. The UI never cares whether a result
// came from a real perception model or the mock endpoint below — both return
// the exact same { stepId, status, confidence, errorCode, perception } shape.
// Swap MockPerceptionService (see mockPerceptionService.js) for a real
// perception pipeline later; this service layer doesn't change.
import { apiFetch } from './api';

export const mlService = {
  verify: (payload) => apiFetch('/ml/verification', { method: 'POST', body: payload }),

  // DEV/DEMO ONLY — every response is tagged mock:true by the backend.
  mock: (payload) => apiFetch('/ml/mock', { method: 'POST', body: payload }),

  // Phase 1 (inhaler) only — proxies a 20-frame window to the internal
  // Python frame classifier and returns a contract-shaped
  // {settled, status, confidence, errorCode, perception} once the
  // window-level smoothing settles. Does NOT mutate the session itself —
  // the caller still submits the result via `verify` above, same as every
  // other workflow.
  inhalerPredict: (payload) => apiFetch('/ml/inhaler/predict', { method: 'POST', body: payload })
};
