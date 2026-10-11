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

export type AdminUser = {
  id: number; fullName: string; email: string; phone?: string | null;
  avatarUrl?: string | null; role: string; adminRoleId?: number | null;
  isActive: boolean; lastLoginAt?: string | null; createdAt: string; updatedAt: string;
  adminRole?: { id: number; name: string; slug: string; isSystem: boolean; isActive: boolean } | null;
};

export type ActivityLog = {
  id: number; userId?: number | null; userEmail?: string | null; userName?: string | null;
  action: string; module: string; targetId?: string | null; targetLabel?: string | null;
  description?: string | null; success: boolean; ipAddress?: string | null;
  userAgent?: string | null; before?: unknown; after?: unknown; createdAt: string;
};

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getRoles = (token: string, signal?: AbortSignal) =>
  apiRequest<{ roles: Role[] }>(`${root}/roles`, { signal }, token);

export const getPermissions = (token: string, signal?: AbortSignal) =>
  apiRequest<{ permissions: Permission[] }>(`${root}/roles/permissions`, { signal }, token);

export const createRole = (token: string, body: { name: string; slug: string; description?: string; sortOrder?: number }) =>
  apiRequest<{ role: Role }>(`${root}/roles`, { method: 'POST', body: JSON.stringify(body) }, token);

export const updateRole = (token: string, id: number, body: { name?: string; slug?: string; description?: string; sortOrder?: number; isActive?: boolean }) =>
  apiRequest<{ role: Role }>(`${root}/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);

export const deleteRole = (token: string, id: number) =>
  apiRequest(`${root}/roles/${id}`, { method: 'DELETE' }, token);

export const setRolePermissions = (token: string, id: number, permissionIds: number[]) =>
  apiRequest<{ role: Role }>(`${root}/roles/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionIds }) }, token);

// ── Admin Users ───────────────────────────────────────────────────────────────
export const getAdminUsers = (token: string, params?: { page?: number; limit?: number; search?: string; roleId?: number; isActive?: boolean }, signal?: AbortSignal) => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  if (params?.roleId != null) q.set('roleId', String(params.roleId));
  if (params?.isActive != null) q.set('isActive', String(params.isActive));
  const qs = q.toString();
  return apiRequest<{ users: AdminUser[]; total: number; page: number; totalPages: number }>(`${root}/admin-users${qs ? `?${qs}` : ''}`, { signal }, token);
};

export const getAdminUser = (token: string, id: number) =>
  apiRequest<{ user: AdminUser }>(`${root}/admin-users/${id}`, {}, token);

export const createAdminUser = (token: string, body: { fullName: string; email: string; phone?: string; password: string; adminRoleId?: number }) =>
  apiRequest<{ user: AdminUser }>(`${root}/admin-users`, { method: 'POST', body: JSON.stringify(body) }, token);

export const updateAdminUser = (token: string, id: number, body: { fullName?: string; phone?: string; adminRoleId?: number }) =>
  apiRequest<{ user: AdminUser }>(`${root}/admin-users/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);

export const setAdminUserStatus = (token: string, id: number, isActive: boolean) =>
  apiRequest<{ user: AdminUser }>(`${root}/admin-users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);

// ── Activity Logs ─────────────────────────────────────────────────────────────
export const getActivityLogs = (token: string, params?: { page?: number; limit?: number; module?: string; action?: string; userId?: number; success?: boolean; from?: string; to?: string; search?: string }, signal?: AbortSignal) => {
  const q = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
  const qs = q.toString();
  return apiRequest<{ logs: ActivityLog[]; total: number; page: number; totalPages: number }>(`${root}/activity-logs${qs ? `?${qs}` : ''}`, { signal }, token);
};

export const getActivityLog = (token: string, id: number) =>
  apiRequest<{ log: ActivityLog }>(`${root}/activity-logs/${id}`, {}, token);
