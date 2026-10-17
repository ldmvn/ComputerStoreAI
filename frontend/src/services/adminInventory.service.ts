import { apiRequest } from './http.client';

export type StockStatus = 'in' | 'low' | 'out';

export type InventoryProduct = {
  id: number;
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  price: number;
  isActive: number;
  stockStatus: StockStatus;
  primaryImage: string | null;
};

export type InventoryStats = {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
};

export type InventoryListResult = {
  products: InventoryProduct[];
  total: number;
  page: number;
  limit: number;
};

export type InventoryLogType = 'IMPORT' | 'ADJUSTMENT' | 'ORDER_DEDUCT' | 'RETURN_RESTORE';

export type InventoryLog = {
  id: number;
  productId: number;
  type: InventoryLogType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reference: string | null;
  note: string | null;
  adminId: number | null;
  createdAt: string;
  product: { id: number; name: string; sku: string };
};

export type InventoryLogsResult = {
  logs: InventoryLog[];
  total: number;
  page: number;
  limit: number;
};

export type InventoryFilters = {
  page?: number;
  limit?: number;
  status?: StockStatus | '';
  search?: string;
  sort?: string;
};

export async function adminGetInventoryStats(token: string | null): Promise<InventoryStats> {
  return apiRequest('/admin/inventory/stats', { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminListInventory(token: string | null, filters: InventoryFilters = {}): Promise<InventoryListResult> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.sort) params.set('sort', filters.sort);
  const qs = params.toString();
  return apiRequest(`/admin/inventory${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminImportStock(
  token: string | null,
  productId: number,
  data: { quantity: number; reference?: string; note?: string }
): Promise<{ product: InventoryProduct; message: string }> {
  return apiRequest(`/admin/inventory/${productId}/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function adminAdjustStock(
  token: string | null,
  productId: number,
  data: { mode: 'set' | 'delta'; value: number; reason: string }
): Promise<{ product: InventoryProduct; before: number; after: number; message: string }> {
  return apiRequest(`/admin/inventory/${productId}/adjust`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function adminGetInventoryLogs(
  token: string | null,
  filters: { page?: number; limit?: number; productId?: number; type?: InventoryLogType | ''; from?: string; to?: string } = {}
): Promise<InventoryLogsResult> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.productId) params.set('productId', String(filters.productId));
  if (filters.type) params.set('type', filters.type);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return apiRequest(`/admin/inventory/logs${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
}
