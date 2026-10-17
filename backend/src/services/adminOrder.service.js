import { prisma } from '../config/prisma.js';
import { refundVoucherUsage } from './voucher.service.js';

const VALID_TRANSITIONS = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING:  ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const orderSelect = {
  id: true, userId: true, status: true, paymentMethod: true, note: true,
  shippingName: true, shippingPhone: true, shippingAddress: true,
  subtotal: true, discountAmount: true, trackingNumber: true, shippingProvider: true,
  confirmedAt: true, shippedAt: true, deliveredAt: true, cancelledAt: true,
  createdAt: true, updatedAt: true,
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  items: {
    select: { id: true, productId: true, name: true, slug: true, price: true, quantity: true, primaryImage: true },
  },
  statusHistory: {
    select: { id: true, status: true, note: true, adminId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
};

export async function listAllOrders({ page = 1, limit = 20, status, search, paymentMethod, from, to } = {}) {
  const where = {};
  if (status) where.status = status;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (search) {
    const idNum = parseInt(search);
    where.OR = [
      ...(idNum > 0 ? [{ id: idNum }] : []),
      { shippingName: { contains: search } },
      { shippingPhone: { contains: search } },
      { user: { OR: [{ fullName: { contains: search } }, { email: { contains: search } }] } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, select: orderSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page, limit };
}

export async function getAdminOrder(id) {
  return prisma.order.findUnique({ where: { id }, select: orderSelect });
}

export async function updateOrderStatus(id, { status, note, trackingNumber, shippingProvider }, adminId) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) { const e = new Error('Đơn hàng không tồn tại.'); e.statusCode = 404; throw e; }

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    const e = new Error(`Không thể chuyển từ ${order.status} sang ${status}.`);
    e.statusCode = 400; throw e;
  }

  const now = new Date();
  const timestamps = {
    CONFIRMED: { confirmedAt: now },
    SHIPPING:  { shippedAt: now },
    DELIVERED: { deliveredAt: now },
    CANCELLED: { cancelledAt: now },
  };

  const orderWithItems = status === 'CANCELLED'
    ? await prisma.order.findUnique({ where: { id }, include: { items: { select: { productId: true, quantity: true } } } })
    : null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        status,
        ...(timestamps[status] || {}),
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        ...(shippingProvider !== undefined ? { shippingProvider } : {}),
      },
      select: orderSelect,
    });
    await tx.orderStatusHistory.create({
      data: { orderId: id, status, note: note?.trim() || null, adminId },
    });

    // Refund voucher usage on admin cancel
    if (status === 'CANCELLED') {
      await refundVoucherUsage(tx, id);
    }

    // Restore stock when admin cancels an order
    if (status === 'CANCELLED' && orderWithItems) {
      for (const item of orderWithItems.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        if (prod) {
          const before = prod.stockQuantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              type: 'RETURN_RESTORE',
              quantityBefore: before,
              quantityChange: item.quantity,
              quantityAfter: before + item.quantity,
              reference: `ĐH #${id}`,
              note: 'Admin hủy đơn hàng',
              adminId,
            },
          });
        }
      }
    }

    return updated;
  });
}

export async function updateShipping(id, { trackingNumber, shippingProvider, note }, adminId) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) { const e = new Error('Đơn hàng không tồn tại.'); e.statusCode = 404; throw e; }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: { trackingNumber, shippingProvider },
      select: orderSelect,
    });
    if (note?.trim()) {
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: order.status, note: note.trim(), adminId },
      });
    }
    return updated;
  });
}

export async function getOrderStats({ from, to } = {}) {
  const where = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [all, byStatus, revenueResult] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], where, _count: true }),
    prisma.order.aggregate({
      where: { ...where, status: { in: ['DELIVERED'] } },
      _sum: { subtotal: true },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map(s => [s.status, s._count]));
  return {
    total: all,
    pending: statusMap.PENDING ?? 0,
    confirmed: statusMap.CONFIRMED ?? 0,
    shipping: statusMap.SHIPPING ?? 0,
    delivered: statusMap.DELIVERED ?? 0,
    cancelled: statusMap.CANCELLED ?? 0,
    revenue: revenueResult._sum.subtotal ?? 0,
  };
}
