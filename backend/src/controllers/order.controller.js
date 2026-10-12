import * as service from '../services/order.service.js';
import { notifyNewOrder, notifyOrderCancelled } from '../services/telegramNotification.service.js';

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

export const create = asyncHandler(async (req, res) => {
  const { items, addressId, paymentMethod, note, voucherCode } = req.body;

  if (!addressId || !Number.isInteger(parseInt(addressId))) {
    return res.status(400).json({ message: 'Vui lòng chọn địa chỉ giao hàng.' });
  }

  const order = await service.createOrder(req.user.userId, {
    items,
    addressId: parseInt(addressId),
    paymentMethod,
    note,
    voucherCode,
  });

  notifyNewOrder(order).catch(e => console.error('[Telegram]', e.message));
  res.status(201).json({ order, message: 'Đặt hàng thành công.' });
});

export const list = asyncHandler(async (req, res) => {
  const orders = await service.listOrders(req.user.userId);
  res.json({ orders });
});

export const detail = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID không hợp lệ.' });
  const order = await service.getOrder(req.user.userId, id);
  if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại.' });
  res.json({ order });
});

export const cancel = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID không hợp lệ.' });
  const order = await service.cancelOrder(req.user.userId, id);
  if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại.' });
  notifyOrderCancelled(order, 'Khách hàng').catch(e => console.error('[Telegram]', e.message));
  res.json({ order, message: 'Đã hủy đơn hàng.' });
});
