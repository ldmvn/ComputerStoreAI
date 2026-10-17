import { apiRequest } from './http.client';

export type AccountRole = { id: number; name: string; slug: string; isSystem: boolean; isActive: boolean };

export type Account = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  role: string;
  adminRoleId: number | null;
  adminRole: AccountRole | null;
  orderCount?: number;
  totalSpent?: number;
  lastOrderAt?: string | null;
};

export type AccountActivity = {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  module: string;
  targetId: string | null;
  targetLabel: string | null;
  description: string | null;
  success: boolean;
  ipAddress: string | null;
  createdAt: string;
};

export type ListAccountsResult = {
  customers: Account[];
  total: number;
  page: number;
  limit: number;
};

export type ActivityResult = {
  logs: AccountActivity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function listAccounts(
  token: string | null,
  params: { page?: number; limit?: number; search?: string; filter?: string; sortBy?: string } = {}
): Promise<ListAccountsResult> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.filter) q.set('filter', params.filter);
  if (params.sortBy) q.set('sortBy', params.sortBy);
  const qs = q.toString();
  return apiRequest(`/admin/customers${qs ? `?${qs}` : ''}`, {}, token);
}

export async function createAccount(
  token: string | null,
  data: { fullName: string; email: string; phone?: string; password: string }
): Promise<{ customer: Account }> {
  return apiRequest('/admin/customers', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function updateAccount(
  token: string | null,
  id: number,
  data: { fullName?: string; email?: string; phone?: string; isActive?: boolean; password?: string }
): Promise<{ customer: Account }> {
  return apiRequest(`/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export async function deleteAccount(token: string | null, id: number): Promise<void> {
  await apiRequest(`/admin/customers/${id}`, { method: 'DELETE' }, token);
}

export async function updateAccountRole(
  token: string | null,
  id: number,
  data: { role: 'USER' | 'ADMIN'; adminRoleId?: number | null }
): Promise<{ customer: Account }> {
  return apiRequest(`/admin/customers/${id}/role`, { method: 'PATCH', body: JSON.stringify(data) }, token);
}

export async function getAccountActivity(
  token: string | null,
  id: number,
  params: { page?: number; limit?: number } = {}
): Promise<ActivityResult> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiRequest(`/admin/customers/${id}/activity${qs ? `?${qs}` : ''}`, {}, token);
}

export async function getAccountDetail(token: string | null, id: number) {
  return apiRequest<{ customer: Account }>(`/admin/customers/${id}`, {}, token);
}
