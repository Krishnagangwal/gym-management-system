import { apiFetch } from './client';

export const workoutPlansApi = {
  list: (token) => apiFetch('/workout-plans', { token }),
  get: (token, id) => apiFetch(`/workout-plans/${id}`, { token }),
  create: (token, body) => apiFetch('/workout-plans', { method: 'POST', body, token }),
  addExercise: (token, planId, body) => apiFetch(`/workout-plans/${planId}/exercises`, { method: 'POST', body, token }),
  assignToMember: (token, memberId, planId) => apiFetch(`/members/${memberId}/workout-plans/${planId}`, { method: 'POST', token }),
  memberPlans: (token, memberId) => apiFetch(`/members/${memberId}/workout-plans`, { token }),
};
