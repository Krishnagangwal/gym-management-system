import { apiFetch } from './client';

export const auditLogApi = {
  list: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/audit-log${qs ? `?${qs}` : ''}`, { token });
  },
  forEntity: (token, entityType, entityId) => apiFetch(`/audit-log/entity/${entityType}/${entityId}`, { token }),
};
