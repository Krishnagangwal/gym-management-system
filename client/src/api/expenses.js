import { apiFetch } from './client';

export const expensesApi = {
  list: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/expenses${qs ? `?${qs}` : ''}`, { token });
  },
  create: (token, body) => apiFetch('/expenses', { method: 'POST', body, token }),
  update: (token, id, body) => apiFetch(`/expenses/${id}`, { method: 'PUT', body, token }),
  remove: (token, id) => apiFetch(`/expenses/${id}`, { method: 'DELETE', token }),
};
