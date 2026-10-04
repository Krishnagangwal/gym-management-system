import { apiFetch } from './client';

export const analyticsApi = {
  get: (token, { from, to } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiFetch(`/analytics${qs ? `?${qs}` : ''}`, { token });
  },
};
