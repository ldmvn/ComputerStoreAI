import { apiRequest } from './http.client';
import type { Order, OrderStats, CreateOrderPayload, ReorderResult } from '@/types/order.type';

export class OrderRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'OrderRequestError';
  }
}

export type OrderFilters = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export async function createOrder(payload: CreateOrderPayload, token: string | null): Promise<Order> {
  try {
    const { order } = await apiRequest<{ order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
    return order;
  } catch (err) {
    if (err instanceof Error) throw new OrderRequestError(err.message, (err as { status?: number }).status ?? 500);
    throw err;
  }
}

export async function listOrders(token: string | null): Promise<Order[]> {
  const { orders } = await apiRequest<{ orders: Order[] }>('/orders', {}, token);
  return orders;
}

// Profile orders page: client-side filtering + pagination
export async function getMyOrders(token: string | null, filters: OrderFilters = {}): Promise<{ orders: Order[]; total: number }> {
  let all: Order[];
  try {
    all = await listOrders(token);
  } catch (err) {
    if (err instanceof Error) throw new OrderRequestError(err.message, (err as { status?: number }).status ?? 500);
    throw err;
  }

  let filtered = all;
  if (filters.status) {
    filtered = filtered.filter(o => o.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(o =>
      String(o.id).includes(q) ||
      o.items.some(i => i.name.toLowerCase().includes(q)) ||
      o.shippingName.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const start = (page - 1) * limit;
  const orders = filtered.slice(start, start + limit);
  return { orders, total };
}

export async function getOrderStats(token: string | null): Promise<OrderStats> {
  const all = await listOrders(token);
  return {
    total: all.length,
    pending: all.filter(o => o.status === 'PENDING').length,
    waitingPickup: all.filter(o => o.status === 'CONFIRMED').length,
    shipping: all.filter(o => o.status === 'SHIPPING').length,
    completed: all.filter(o => o.status === 'DELIVERED').length,
    cancelled: all.filter(o => o.status === 'CANCELLED').length,
    totalValue: all.reduce((sum, o) => sum + o.subtotal, 0),
  };
}

export async function getOrder(id: number, token: string | null): Promise<Order> {
  const { order } = await apiRequest<{ order: Order }>(`/orders/${id}`, {}, token);
  return order;
}

export async function cancelOrder(token: string | null, id: number): Promise<{ order: Order }> {
  const { order } = await apiRequest<{ order: Order }>(`/orders/${id}/cancel`, { method: 'PATCH' }, token);
  return { order };
}

export async function updateOrderAddress(token: string | null, id: number, addressId: number): Promise<Order> {
  const { order } = await apiRequest<{ order: Order }>(`/orders/${id}/address`, {
    method: 'PATCH',
    body: JSON.stringify({ addressId }),
  }, token);
  return order;
}

export async function reorderItems(token: string | null, id: number): Promise<ReorderResult> {
  return apiRequest<ReorderResult>(`/orders/${id}/reorder`, { method: 'POST' }, token);
}

export async function updateOrderPaymentMethod(token: string | null, id: number, paymentMethod: string): Promise<Order> {
  const { order } = await apiRequest<{ order: Order }>(`/orders/${id}/payment-method`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentMethod }),
  }, token);
  return order;
}
