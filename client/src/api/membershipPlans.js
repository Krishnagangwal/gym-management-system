import { apiFetch } from './client';

export const membershipPlansApi = {
  list: (token) => apiFetch('/membership-plans', { token }),
  create: (token, body) => apiFetch('/membership-plans', { method: 'POST', body, token }),
  update: (token, id, body) => apiFetch(`/membership-plans/${id}`, { method: 'PUT', body, token }),
};
