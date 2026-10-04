import { apiFetch } from './client';

export const membersApi = {
  list: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/members${qs ? `?${qs}` : ''}`, { token });
  },
  get: (token, id) => apiFetch(`/members/${id}`, { token }),
  create: (token, body) => apiFetch('/members', { method: 'POST', body, token }),
  update: (token, id, body) => apiFetch(`/members/${id}`, { method: 'PUT', body, token }),
  setStatus: (token, id, isActive) => apiFetch(`/members/${id}/status`, { method: 'PATCH', body: { isActive }, token }),
  getLogin: (token, id) => apiFetch(`/members/${id}/login`, { token }).catch(() => null),
  createLogin: (token, id, body) => apiFetch(`/members/${id}/login`, { method: 'POST', body, token }),
};
