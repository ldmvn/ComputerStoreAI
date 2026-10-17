import { apiRequest } from './http.client';

export type VoucherType = 'PERCENT' | 'FIXED';
export type VoucherStatus = 'active' | 'upcoming' | 'expired' | 'disabled' | 'exhausted';

export type Voucher = {
  id: number;
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  status: VoucherStatus;
  createdAt: string;
  updatedAt: string;
};

export type VoucherStats = {
  total: number;
  active: number;
  upcoming: number;
  expired: number;
  disabled: number;
  totalUsage: number;
  totalDiscount: number;
};

export type VoucherListResult = {
  vouchers: Voucher[];
  total: number;
  page: number;
  limit: number;
};

export type VoucherInput = {
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscount?: number | null;
  minOrderAmount?: number;
  startAt?: string | null;
  endAt?: string | null;
  usageLimit?: number | null;
  isActive?: boolean;
};

export async function adminGetVoucherStats(token: string | null): Promise<VoucherStats> {
  return apiRequest('/admin/vouchers/stats', { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminListVouchers(
  token: string | null,
  filters: { page?: number; limit?: number; search?: string; status?: VoucherStatus | '' } = {}
): Promise<VoucherListResult> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return apiRequest(`/admin/vouchers${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminCreateVoucher(token: string | null, data: VoucherInput): Promise<{ voucher: Voucher; message: string }> {
  return apiRequest('/admin/vouchers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function adminUpdateVoucher(token: string | null, id: number, data: VoucherInput): Promise<{ voucher: Voucher; message: string }> {
  return apiRequest(`/admin/vouchers/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function adminToggleVoucher(token: string | null, id: number, isActive: boolean): Promise<{ voucher: Voucher; message: string }> {
  return apiRequest(`/admin/vouchers/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isActive }),
  });
}

export async function adminDeleteVoucher(token: string | null, id: number): Promise<{ message: string }> {
  return apiRequest(`/admin/vouchers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}
