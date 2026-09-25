// src/services/reportService.js
// Medical records: prescriptions, lab reports, and other supporting
// documents. Report ANALYSIS is intentionally not a feature here — this is
// storage + retrieval only.
import { apiFetch, apiUpload } from './api';

export const reportService = {
  upload: (file, category) => {
    const fd = new FormData();
    fd.append('report', file);
    if (category) fd.append('category', category);
    return apiUpload('/reports', fd);
  },
  list: () => apiFetch('/reports')
};
