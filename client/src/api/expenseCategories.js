import { apiFetch } from './client';

export const expenseCategoriesApi = {
  list: (token) => apiFetch('/expense-categories', { token }),
  create: (token, body) => apiFetch('/expense-categories', { method: 'POST', body, token }),
  update: (token, id, body) => apiFetch(`/expense-categories/${id}`, { method: 'PUT', body, token }),
};
