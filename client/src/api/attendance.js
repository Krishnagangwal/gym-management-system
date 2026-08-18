import { apiFetch } from './client';

export const attendanceApi = {
  checkIn: (token, memberId) => apiFetch('/attendance/check-in', { method: 'POST', body: { memberId }, token }),
  checkOut: (token, id) => apiFetch(`/attendance/${id}/check-out`, { method: 'PATCH', token }),
  list: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/attendance${qs ? `?${qs}` : ''}`, { token });
  },
};
