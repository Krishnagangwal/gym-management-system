import { apiFetch } from './client';

export const employeesApi = {
  list: (token) => apiFetch('/employees', { token }),
  get: (token, id) => apiFetch(`/employees/${id}`, { token }),
  create: (token, body) => apiFetch('/employees', { method: 'POST', body, token }),
  update: (token, id, body) => apiFetch(`/employees/${id}`, { method: 'PUT', body, token }),
  setStatus: (token, id, isActive) => apiFetch(`/employees/${id}/status`, { method: 'PATCH', body: { isActive }, token }),
};
