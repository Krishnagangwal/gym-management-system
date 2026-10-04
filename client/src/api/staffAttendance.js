import { apiFetch } from './client';

export const staffAttendanceApi = {
  mark: (token, body) => apiFetch('/staff-attendance', { method: 'POST', body, token }),
  grid: (token, year, month) => apiFetch(`/staff-attendance/grid?year=${year}&month=${month}`, { token }),
  forEmployee: (token, employeeId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/staff-attendance/employee/${employeeId}${qs ? `?${qs}` : ''}`, { token });
  },
};
