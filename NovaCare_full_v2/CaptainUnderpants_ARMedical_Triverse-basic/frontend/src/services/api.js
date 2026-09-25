// src/services/api.js
// SINGLE SOURCE OF TRUTH for the API base URL.
// All other services import API_BASE and apiFetch from here — never hardcode URLs.

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

// Standard headers — adds Bearer token if logged in
const buildHeaders = (extra = {}, withAuth = true) => {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (withAuth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// Generic fetch wrapper. Throws on non-2xx so callers can use try/catch.
export const apiFetch = async (path, { method = 'GET', body, withAuth = true, headers } = {}) => {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: buildHeaders(headers, withAuth),
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    throw new Error(`Backend unreachable at ${API_BASE}. Start the backend server and refresh.`);
  }

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

// Multipart helper — used for file uploads
export const apiUpload = async (path, formData, { withAuth = true } = {}) => {
  const headers = {};
  if (withAuth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || `Upload failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
};
