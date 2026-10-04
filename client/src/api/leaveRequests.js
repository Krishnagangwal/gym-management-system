import { apiFetch } from './client';

export const leaveRequestsApi = {
  apply: (token, body) => apiFetch('/leave-requests', { method: 'POST', body, token }),
  list: (token, employeeId) => apiFetch(`/leave-requests${employeeId ? `?employeeId=${employeeId}` : ''}`, { token }),
};
