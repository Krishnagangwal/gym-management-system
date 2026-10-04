import { apiFetch } from './client';

export const trainerPortalApi = {
  myMembers: (token) => apiFetch('/trainer/members', { token }),
  myMember: (token, memberId) => apiFetch(`/trainer/members/${memberId}`, { token }),
  updateNotes: (token, memberId, notes) => apiFetch(`/trainer/members/${memberId}/notes`, { method: 'PUT', body: { notes }, token }),
  assignWorkoutPlan: (token, memberId, planId) => apiFetch(`/trainer/members/${memberId}/workout-plan`, { method: 'POST', body: { planId }, token }),
  performance: (token) => apiFetch('/trainer/performance', { token }),
};
