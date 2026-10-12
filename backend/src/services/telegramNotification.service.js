const TIMEOUT_MS = 5_000;

function isConfigured() {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function sendMessage(text) {
  if (!isConfigured()) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error('[Telegram] API error %d: %s', res.status, body.slice(0, 120));
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('[Telegram] Request timed out');
    } else {
      console.error('[Telegram] Send failed:', e.message);
    }
  } finally {
    clearTimeout(timer);
  }
}

const STATUS_LABEL = {
  PENDING:   'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING:  'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

function fmtMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount) || 0) + '₫';
}

function fmtTime(dt) {
  return new Date(dt || Date.now()).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// In-memory dedup: one notification per (event key) within 10 s
const _sent = new Set();
function dedupe(key, ttlMs = 10_000) {
  if (_sent.has(key)) return false;
  _sent.add(key);
  setTimeout(() => _sent.delete(key), ttlMs);
  return true;
}

// ── Public helpers ────────────────────────────────────────────────────────────

export async function notifyNewOrder(order) {
  if (!dedupe(`new:${order.id}`)) return;

  const total = (Number(order.subtotal) || 0) - (Number(order.discountAmount) || 0);
  const payLabel = order.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'Chuyển khoản';

  await sendMessage([
    '🛒 <b>ĐƠN HÀNG MỚI</b>',
    `Mã đơn: <b>#${order.id}</b>`,
    `Khách hàng: ${order.shippingName || '—'}`,
    `SĐT: ${order.shippingPhone || '—'}`,
    `Tổng tiền: <b>${fmtMoney(total)}</b>`,
    `Thanh toán: ${payLabel}`,
    `Số sản phẩm: ${order.items?.length ?? 0}`,
    `Thời gian: ${fmtTime(order.createdAt)}`,
  ].join('\n'));
}

export async function notifyOrderCancelled(order, cancelledBy = 'Khách hàng') {
  if (!dedupe(`cancel:${order.id}`)) return;

  const total = (Number(order.subtotal) || 0) - (Number(order.discountAmount) || 0);

  await sendMessage([
    '❌ <b>ĐƠN HÀNG BỊ HỦY</b>',
    `Mã đơn: <b>#${order.id}</b>`,
    `Hủy bởi: ${cancelledBy}`,
    `Khách hàng: ${order.shippingName || '—'}`,
    `Tổng tiền: ${fmtMoney(total)}`,
    `Thời gian: ${fmtTime(order.cancelledAt || new Date())}`,
  ].join('\n'));
}

export async function notifyStatusChanged(order, previousStatus) {
  if (!dedupe(`status:${order.id}:${previousStatus}->${order.status}`)) return;

  const total = (Number(order.subtotal) || 0) - (Number(order.discountAmount) || 0);

  await sendMessage([
    '📦 <b>CẬP NHẬT ĐƠN HÀNG</b>',
    `Mã đơn: <b>#${order.id}</b>`,
    `Trạng thái cũ: ${STATUS_LABEL[previousStatus] || previousStatus}`,
    `Trạng thái mới: <b>${STATUS_LABEL[order.status] || order.status}</b>`,
    `Tổng tiền: ${fmtMoney(total)}`,
  ].join('\n'));
}
