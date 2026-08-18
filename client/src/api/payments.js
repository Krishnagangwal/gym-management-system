import { apiFetch } from './client';

export const paymentsApi = {
  list: (token) => apiFetch('/payments', { token }),
  create: (token, body) => apiFetch('/payments', { method: 'POST', body, token }),
  receipt: (token, id) => apiFetch(`/payments/${id}/receipt`, { token }),
};
