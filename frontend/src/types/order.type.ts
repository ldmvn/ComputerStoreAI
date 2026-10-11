export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export type OrderItem = {
  id: number;
  productId: number;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  primaryImage: string | null;
};

export type Order = {
  id: number;
  userId: number;
  status: OrderStatus;
  paymentMethod: string;
  note: string | null;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  subtotal: number;
  discountAmount: number;
  trackingNumber: string | null;
  shippingProvider: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type OrderStats = {
  total: number;
  waitingPickup: number;
  completed: number;
  totalValue: number;
  pending: number;
  shipping: number;
  cancelled: number;
};

export type CreateOrderPayload = {
  items: { productId: number; quantity: number }[];
  addressId: number;
  paymentMethod: string;
  note?: string;
  voucherCode?: string;
};
