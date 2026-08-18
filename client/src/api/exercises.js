import { apiFetch } from './client';

export const exercisesApi = {
  list: (token) => apiFetch('/exercises', { token }),
  create: (token, body) => apiFetch('/exercises', { method: 'POST', body, token }),
};
