import { apiFetch } from './client';

export const meApi = {
  dashboard: (token) => apiFetch('/me/dashboard', { token }),
  membership: (token) => apiFetch('/me/membership', { token }),
  requestRenewal: (token) => apiFetch('/me/membership/request-renewal', { method: 'POST', token }),
  workoutPlans: (token) => apiFetch('/me/workout-plans', { token }),
  attendance: (token) => apiFetch('/me/attendance', { token }),
  payments: (token) => apiFetch('/me/payments', { token }),
  receipt: (token, id) => apiFetch(`/me/payments/${id}/receipt`, { token }),
  logProgress: (token, body) => apiFetch('/me/progress', { method: 'POST', body, token }),
  progress: (token) => apiFetch('/me/progress', { token }),
  todaysWorkout: (token) => apiFetch('/me/today-workout', { token }),
  logWorkout: (token, body) => apiFetch('/me/workout-logs', { method: 'POST', body, token }),
  workoutLogs: (token) => apiFetch('/me/workout-logs', { token }),
};
