// src/services/authService.js
import { apiFetch } from './api';

export const authService = {
  register: (data) =>
    apiFetch('/auth/register', { method: 'POST', body: data, withAuth: false }),

  login: (data) =>
    apiFetch('/auth/login', { method: 'POST', body: data, withAuth: false }),

  me: () => apiFetch('/auth/me'),

  updateMedicalInfo: (medicalInfo) =>
    apiFetch('/users/medical-info', { method: 'PUT', body: medicalInfo }),

  getProfile: () => apiFetch('/users/profile'),

  // Local helpers
  saveToken: (token) => localStorage.setItem('token', token),
  getToken: () => localStorage.getItem('token'),
  clearToken: () => localStorage.removeItem('token'),
  isAuthenticated: () => !!localStorage.getItem('token')
};
