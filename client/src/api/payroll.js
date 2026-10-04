import { apiFetch } from './client';

export const payrollApi = {
  generateRun: (token, month, year) => apiFetch('/payroll/runs', { method: 'POST', body: { month, year }, token }),
  listRuns: (token) => apiFetch('/payroll/runs', { token }),
  getRun: (token, id) => apiFetch(`/payroll/runs/${id}`, { token }),
  finalizeRun: (token, id) => apiFetch(`/payroll/runs/${id}/finalize`, { method: 'POST', token }),
  getPayslip: (token, id) => apiFetch(`/payroll/payslips/${id}`, { token }),
};
