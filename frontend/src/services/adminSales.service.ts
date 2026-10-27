import { apiRequest } from './http.client';
import type { Order, OrderStatus } from '@/types/order.type';

// ── Types ────────────────────────────────────────────────────────────────────

export type AdminOrderFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
};

export type AdminOrdersResult = {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
};

export type AdminOrder = Order & {
  user: { id: number; fullName: string; email: string; phone: string };
  statusHistory: { id: number; status: OrderStatus; note: string | null; adminId: number; createdAt: string }[];
};

export type AdminOrderStats = {
  total: number;
  pending: number;
  confirmed: number;
  shipping: number;
  delivered: number;
  cancelled: number;
  revenue: number;
};

export type AdminCustomer = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export type AdminCustomerDetail = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  totalOrders: number;
  deliveredOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  orders: { id: number; status: string; paymentMethod: string; subtotal: number; createdAt: string }[];
};

export type AdminCustomerStats = {
  total: number;
  newCount: number;
  withOrders: number;
  withoutOrders: number;
};

export type CustomerFilter = 'all' | 'no_orders' | 'has_orders' | 'returning';
export type CustomerSortBy = 'newest' | 'oldest' | 'orders' | 'spent';

export type AdminReturn = {
  id: number;
  orderId: number;
  userId: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  order: Pick<Order, 'id' | 'status' | 'subtotal' | 'shippingName' | 'shippingPhone' | 'shippingAddress' | 'items'>;
  user: { id: number; fullName: string; email: string; phone: string };
};

export type RevenueData = {
  revenue: number;
  deliveredOrders: number;
  statusBreakdown: Record<string, { count: number; sum: number }>;
};

export type TopProduct = {
  productId: number;
  name: string;
  slug: string;
  primaryImage: string | null;
  totalQuantity: number;
  totalRevenue: number;
};

export type DailyRevenue = { date: string; revenue: number; count: number };

export type ReportSummary = {
  revenue: RevenueData;
  topProducts: TopProduct[];
  dailyRevenue: DailyRevenue[];
  newCustomers: number;
};

// ── Admin Orders ──────────────────────────────────────────────────────────────

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}

export async function adminListOrders(token: string | null, filters: AdminOrderFilters = {}): Promise<AdminOrdersResult> {
  return apiRequest<AdminOrdersResult>(`/admin/orders${buildQuery(filters as Record<string, string | number>)}`, {}, token);
}

export async function adminGetOrder(token: string | null, id: number): Promise<AdminOrder> {
  const { order } = await apiRequest<{ order: AdminOrder }>(`/admin/orders/${id}`, {}, token);
  return order;
}

export async function adminGetOrderStats(token: string | null, from?: string, to?: string): Promise<AdminOrderStats> {
  return apiRequest<AdminOrderStats>(`/admin/orders/stats${buildQuery({ from, to })}`, {}, token);
}

export async function adminUpdateOrderStatus(
  token: string | null, id: number,
  payload: { status: string; note?: string; trackingNumber?: string; shippingProvider?: string }
): Promise<AdminOrder> {
  const { order } = await apiRequest<{ order: AdminOrder }>(`/admin/orders/${id}/status`, {
    method: 'PATCH', body: JSON.stringify(payload),
  }, token);
  return order;
}

export async function adminUpdateShipping(
  token: string | null, id: number,
  payload: { trackingNumber?: string; shippingProvider?: string; note?: string }
): Promise<AdminOrder> {
  const { order } = await apiRequest<{ order: AdminOrder }>(`/admin/orders/${id}/shipping`, {
    method: 'PATCH', body: JSON.stringify(payload),
  }, token);
  return order;
}

// ── Admin Customers ───────────────────────────────────────────────────────────

export async function adminGetCustomerStats(token: string | null): Promise<AdminCustomerStats> {
  return apiRequest<AdminCustomerStats>('/admin/customers/stats', {}, token);
}

export async function adminListCustomers(
  token: string | null,
  params: { page?: number; limit?: number; search?: string; filter?: CustomerFilter; sortBy?: CustomerSortBy } = {}
): Promise<{ customers: AdminCustomer[]; total: number; page: number; limit: number }> {
  return apiRequest(`/admin/customers${buildQuery(params as Record<string, string | number>)}`, {}, token);
}

export async function adminGetCustomer(token: string | null, id: number): Promise<AdminCustomerDetail> {
  const { customer } = await apiRequest<{ customer: AdminCustomerDetail }>(`/admin/customers/${id}`, {}, token);
  return customer;
}

// ── Admin Returns ─────────────────────────────────────────────────────────────

export async function adminListReturns(
  token: string | null, params: { page?: number; limit?: number; status?: string; search?: string } = {}
): Promise<{ returns: AdminReturn[]; total: number; page: number; limit: number }> {
  return apiRequest(`/admin/returns${buildQuery(params as Record<string, string | number>)}`, {}, token);
}

export async function adminGetReturn(token: string | null, id: number): Promise<AdminReturn> {
  const { return: ret } = await apiRequest<{ return: AdminReturn }>(`/admin/returns/${id}`, {}, token);
  return ret;
}

export async function adminUpdateReturnStatus(
  token: string | null, id: number,
  payload: { status: string; adminNote?: string }
): Promise<AdminReturn> {
  const { return: ret } = await apiRequest<{ return: AdminReturn }>(`/admin/returns/${id}/status`, {
    method: 'PATCH', body: JSON.stringify(payload),
  }, token);
  return ret;
}

// ── Admin Reports ─────────────────────────────────────────────────────────────

export async function adminGetReport(token: string | null, from?: string, to?: string): Promise<ReportSummary> {
  return apiRequest<ReportSummary>(`/admin/reports${buildQuery({ from, to })}`, {}, token);
}
