import { apiFetch } from './client';

export const trainersApi = {
  list: (token) => apiFetch('/trainers', { token }),
  create: (token, body) => apiFetch('/trainers', { method: 'POST', body, token }),
  update: (token, id, body) => apiFetch(`/trainers/${id}`, { method: 'PUT', body, token }),
  setStatus: (token, id, isActive) => apiFetch(`/trainers/${id}/status`, { method: 'PATCH', body: { isActive }, token }),
  assign: (token, trainerId, memberId) => apiFetch(`/trainers/${trainerId}/assign/${memberId}`, { method: 'POST', token }),
  memberTrainer: (token, memberId) => apiFetch(`/members/${memberId}/trainer`, { token }).catch(() => null),
};
