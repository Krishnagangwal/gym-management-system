import { apiFetch } from './client';

export function getSummary(token) {
  return apiFetch('/dashboard/summary', { token });
}
