import { apiFetch } from './client';

export const invoicesApi = {
  list: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/invoices${qs ? `?${qs}` : ''}`, { token });
  },
  get: (token, id) => apiFetch(`/invoices/${id}`, { token }),
  receivablesAging: (token) => apiFetch('/invoices/receivables-aging', { token }),
};
