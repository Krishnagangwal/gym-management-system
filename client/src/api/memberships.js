import { apiFetch } from './client';

export const membershipsApi = {
  assignOrRenew: (token, memberId, body) => apiFetch(`/members/${memberId}/memberships`, { method: 'POST', body, token }),
  history: (token, memberId) => apiFetch(`/members/${memberId}/memberships`, { token }),
  listAll: (token, status) => apiFetch(`/memberships${status ? `?status=${status}` : ''}`, { token }),
};
