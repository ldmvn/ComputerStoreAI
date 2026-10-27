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

export const updateAddress = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID không hợp lệ.' });
  const { addressId } = req.body;
  if (!addressId || !Number.isInteger(parseInt(addressId))) {
    return res.status(400).json({ message: 'addressId không hợp lệ.' });
  }
  const order = await service.updateOrderAddress(req.user.userId, id, parseInt(addressId));
  res.json({ order, message: 'Đã cập nhật địa chỉ giao hàng.' });
});

export const updatePaymentMethod = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID không hợp lệ.' });
  const { paymentMethod } = req.body;
  if (!paymentMethod) return res.status(400).json({ message: 'paymentMethod không hợp lệ.' });
  const order = await service.updateOrderPaymentMethod(req.user.userId, id, paymentMethod);
  res.json({ order, message: 'Đã cập nhật phương thức thanh toán.' });
});

export const reorder = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID không hợp lệ.' });
  const result = await service.reorderItems(req.user.userId, id);
  res.json(result);
});

export const cancel = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID không hợp lệ.' });
  const order = await service.cancelOrder(req.user.userId, id);
  if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại.' });
  notifyOrderCancelled(order, 'Khách hàng').catch(e => console.error('[Telegram]', e.message));
  res.json({ order, message: 'Đã hủy đơn hàng.' });
});
