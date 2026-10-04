import { apiFetch } from './client';

export const approvalsApi = {
  list: (token, status) => apiFetch(`/approvals${status ? `?status=${status}` : ''}`, { token }),
  pendingCount: (token) => apiFetch('/approvals/pending-count', { token }),
  approve: (token, id, reviewNote) => apiFetch(`/approvals/${id}/approve`, { method: 'POST', body: { reviewNote }, token }),
  reject: (token, id, reviewNote) => apiFetch(`/approvals/${id}/reject`, { method: 'POST', body: { reviewNote }, token }),
};
