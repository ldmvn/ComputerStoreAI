import { apiRequest } from './http.client';

const root = '/admin';

export type Permission = {
  id: number; module: string; action: string; label: string; description?: string | null;
};

export type Role = {
  id: number; name: string; slug: string; description?: string | null;
  isSystem: boolean; isActive: boolean; sortOrder: number;
  createdAt: string; updatedAt: string;
  permissions: { roleId: number; permissionId: number; permission: Permission }[];
  _count?: { adminUsers: number };
};

export type ActivityLog = {
  id: number; userId?: number | null; userEmail?: string | null; userName?: string | null;
  action: string; module: string; targetId?: string | null; targetLabel?: string | null;
  description?: string | null; success: boolean; ipAddress?: string | null;
  userAgent?: string | null; before?: unknown; after?: unknown; createdAt: string;
};

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getRoles = (token: string | null, signal?: AbortSignal) =>
  apiRequest<{ roles: Role[] }>(`${root}/roles`, { signal }, token);

export const getPermissions = (token: string | null, signal?: AbortSignal) =>
  apiRequest<{ permissions: Permission[] }>(`${root}/roles/permissions`, { signal }, token);

export const createRole = (token: string | null, body: { name: string; slug: string; description?: string; sortOrder?: number }) =>
  apiRequest<{ role: Role }>(`${root}/roles`, { method: 'POST', body: JSON.stringify(body) }, token);

export const updateRole = (token: string | null, id: number, body: { name?: string; slug?: string; description?: string; sortOrder?: number; isActive?: boolean }) =>
  apiRequest<{ role: Role }>(`${root}/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);

export const deleteRole = (token: string | null, id: number) =>
  apiRequest(`${root}/roles/${id}`, { method: 'DELETE' }, token);

export const setRolePermissions = (token: string | null, id: number, permissionIds: number[]) =>
  apiRequest<{ role: Role }>(`${root}/roles/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionIds }) }, token);

// ── Activity Logs ─────────────────────────────────────────────────────────────
export const getActivityLogs = (token: string | null, params?: { page?: number; limit?: number; module?: string; action?: string; userId?: number; success?: boolean; from?: string; to?: string; search?: string }, signal?: AbortSignal) => {
  const q = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
  const qs = q.toString();
  return apiRequest<{ logs: ActivityLog[]; total: number; page: number; totalPages: number }>(`${root}/activity-logs${qs ? `?${qs}` : ''}`, { signal }, token);
};

export const getActivityLog = (token: string | null, id: number) =>
  apiRequest<{ log: ActivityLog }>(`${root}/activity-logs/${id}`, {}, token);
