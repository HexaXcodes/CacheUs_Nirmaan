// src/services/medicationService.js
import { apiFetch } from './api';

export const medicationService = {
  list: (params = {}) => {
    const qs = params.active !== undefined ? `?active=${params.active}` : '';
    return apiFetch(`/medications${qs}`);
  },
  create: (payload) => apiFetch('/medications', { method: 'POST', body: payload }),
  get: (id) => apiFetch(`/medications/${id}`),
  update: (id, payload) => apiFetch(`/medications/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => apiFetch(`/medications/${id}`, { method: 'DELETE' }),
  log: (id, payload) => apiFetch(`/medications/${id}/log`, { method: 'POST', body: payload }),
  today: () => apiFetch('/medications/today'),
  history: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/medications/history${qs ? `?${qs}` : ''}`);
  }
};
