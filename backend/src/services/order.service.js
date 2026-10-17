import { prisma } from '../config/prisma.js';
import { validateVoucher, applyVoucherInTx, refundVoucherUsage } from './voucher.service.js';

const ALLOWED_PAYMENT = ['COD', 'BANK_TRANSFER'];

const orderSelect = {
  id: true, userId: true, status: true, paymentMethod: true, note: true,
  shippingName: true, shippingPhone: true, shippingAddress: true,
  subtotal: true, discountAmount: true,
  trackingNumber: true, shippingProvider: true,
  confirmedAt: true, shippedAt: true, deliveredAt: true, cancelledAt: true,
  createdAt: true, updatedAt: true,
  items: {
    select: {
      id: true, productId: true, name: true, slug: true,
      price: true, quantity: true, primaryImage: true,
    },
  },
};

export async function createOrder(userId, { items, addressId, paymentMethod, note, voucherCode }) {
  if (!ALLOWED_PAYMENT.includes(paymentMethod)) {
    const err = new Error('Phương thức thanh toán không hợp lệ.');
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Đơn hàng phải có ít nhất một sản phẩm.');
    err.statusCode = 400;
    throw err;
  }

  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) {
    const err = new Error('Địa chỉ giao hàng không hợp lệ.');
    err.statusCode = 400;
    throw err;
  }

  const productIds = [...new Set(items.map(i => parseInt(i.productId)).filter(id => id > 0))];
  if (productIds.length !== items.length) {
    const err = new Error('Dữ liệu sản phẩm không hợp lệ.');
    err.statusCode = 400;
    throw err;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true, isDeleted: false },
    select: {
      id: true, name: true, slug: true, price: true, stockQuantity: true,
      images: { where: { isPrimary: true }, select: { imageUrl: true }, take: 1 },
    },
  });

  if (products.length !== productIds.length) {
    const err = new Error('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng bán.');
    err.statusCode = 422;
    throw err;
  }

  const productMap = new Map(products.map(p => [p.id, p]));

  const orderItems = items.map(({ productId, quantity }) => {
    const pid = parseInt(productId);
    const qty = parseInt(quantity);
    const product = productMap.get(pid);
    if (!product) {
      const err = new Error('Sản phẩm không tồn tại.'); err.statusCode = 422; throw err;
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
      const err = new Error('Số lượng không hợp lệ.'); err.statusCode = 400; throw err;
    }
    if (qty > product.stockQuantity) {
      const err = new Error(`Sản phẩm "${product.name}" chỉ còn ${product.stockQuantity} trong kho.`);
      err.statusCode = 422;
      throw err;
    }
    const primaryImage = product.images?.[0]?.imageUrl ?? null;
    return { productId: pid, name: product.name, slug: product.slug, price: product.price, quantity: qty, primaryImage };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingAddress = `${address.streetAddress}, ${address.communeName}, ${address.provinceName}`;

  // Validate voucher before entering transaction (throws on invalid)
  let voucherInfo = null;
  if (voucherCode?.trim()) {
    voucherInfo = await validateVoucher(voucherCode.trim(), subtotal, userId);
  }

  const discountAmount = voucherInfo?.discountAmount ?? 0;

  return prisma.$transaction(async (tx) => {
    // Re-check stock and capture current quantities
    const stockBefore = new Map();
    for (const item of orderItems) {
      const prod = await tx.product.findFirst({
        where: { id: item.productId, isActive: true, isDeleted: false },
        select: { stockQuantity: true, name: true },
      });
      if (!prod || prod.stockQuantity < item.quantity) {
        const name = prod?.name || item.name;
        const err = new Error(`Sản phẩm "${name}" không đủ số lượng tồn kho.`);
        err.statusCode = 422;
        throw err;
      }
      stockBefore.set(item.productId, prod.stockQuantity);
    }

    // Create order
    const order = await tx.order.create({
      data: {
        userId,
        paymentMethod,
        note: note?.trim() || null,
        shippingName: address.fullName,
        shippingPhone: address.phone,
        shippingAddress,
        subtotal,
        discountAmount,
        items: { create: orderItems },
      },
      select: orderSelect,
    });

    // Apply voucher atomically (re-checks limit inside tx)
    if (voucherInfo) {
      await applyVoucherInTx(tx, voucherInfo.id, order.id, userId, discountAmount);
    }

    // Deduct stock atomically — conditional update prevents race conditions
    // between concurrent transactions that both passed the pre-check above.
    for (const item of orderItems) {
      const before = stockBefore.get(item.productId);
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          isActive: true,
          isDeleted: false,
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        const err = new Error(`Sản phẩm "${item.name}" vừa hết hàng, vui lòng thử lại.`);
        err.statusCode = 422;
        throw err;
      }
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          type: 'ORDER_DEDUCT',
          quantityBefore: before,
          quantityChange: -item.quantity,
          quantityAfter: before - item.quantity,
          reference: `ĐH #${order.id}`,
        },
      });
    }

    return order;
  });
}

export async function listOrders(userId) {
  return prisma.order.findMany({
    where: { userId },
    select: orderSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrder(userId, orderId) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    select: orderSelect,
  });
}

export async function cancelOrder(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: { select: { productId: true, quantity: true } } },
  });
  if (!order) return null;
  if (order.status !== 'PENDING') {
    const err = new Error('Chỉ có thể hủy đơn hàng ở trạng thái chờ xử lý.');
    err.statusCode = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      select: orderSelect,
    });

    for (const item of order.items) {
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
            reference: `ĐH #${orderId}`,
            note: 'Khách hủy đơn hàng',
          },
        });
      }
    }

    // Refund voucher usage count if applicable
    await refundVoucherUsage(tx, orderId);

    return updated;
  });
}
