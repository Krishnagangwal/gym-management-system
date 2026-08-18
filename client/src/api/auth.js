import { apiFetch } from './client';

export function login(email, password) {
  return apiFetch('/auth/login', { method: 'POST', body: { email, password } });
}
