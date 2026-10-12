import * as svc from '../services/storeSetting.service.js';
import { ensureResetMailReady, sendTestMail } from '../services/passwordResetMail.service.js';
import { logActivity } from '../services/activityLog.service.js';

const err = (res, e) => {
  const status = e?.status ?? e?.statusCode ?? 500;
  res.status(status).json({ success: false, message: e.message });
};

// In-memory rate limit: max 3 test emails per userId per 60 s
const _testEmailBucket = new Map();
function _allowTestEmail(userId) {
  const now = Date.now();
  const entry = _testEmailBucket.get(userId) ?? { n: 0, t: now };
  if (now - entry.t > 60_000) { entry.n = 1; entry.t = now; }
  else entry.n++;
  _testEmailBucket.set(userId, entry);
  return entry.n <= 3;
}

export async function getAll(req, res) {
  try {
    const data = await svc.getAllSettings();
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
}

export async function getPublicStore(req, res) {
  try {
    const data = await svc.getSettingsByPrefix('store.');
    const social = await svc.getSettingsByPrefix('social.');
    const footer = await svc.getSettingsByPrefix('footer.');
    res.json({ success: true, data: { ...data, ...social, ...footer } });
  } catch (e) { err(res, e); }
}

export async function update(req, res) {
  try {
    await svc.setSettings(req.body);
    res.json({ success: true, message: 'Đã lưu cài đặt.' });
  } catch (e) { err(res, e); }
}

export async function getSmtpStatus(req, res) {
  try {
    const host = process.env.SMTP_HOST?.trim() || null;
    const from = process.env.SMTP_FROM?.trim() || null;
    const hasAuth = !!(process.env.SMTP_USER?.trim());
    const port = process.env.SMTP_PORT || '587';
    const configured = !!(host && from);
    // Try cached verify state — don't block on a live connect
    let lastError = null;
    if (configured) {
      try { await ensureResetMailReady(); } catch (e) { lastError = e.code || 'SMTP_ERROR'; }
    }
    res.json({ success: true, data: { configured, host, port, from, hasAuth, lastError } });
  } catch (e) { err(res, e); }
}

export async function sendTestEmail(req, res) {
  try {
    const { to } = req.body ?? {};
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to).trim())) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ.' });
    }
    const userId = req.user?.userId;
    if (!_allowTestEmail(userId)) {
      return res.status(429).json({ success: false, message: 'Quá nhiều yêu cầu gửi email thử. Vui lòng chờ 1 phút.' });
    }
    await sendTestMail(to.trim());
    const maskedTo = to.replace(/(.{2}).*(@.*)/, '$1***$2');
    await logActivity({ req, action: 'test_email', module: 'settings', description: `Gửi email thử đến ${maskedTo}`, success: true }).catch(() => {});
    res.json({ success: true, message: 'Email thử đã được gửi. Vui lòng kiểm tra hộp thư.' });
  } catch (e) {
    const maskedTo = String(req.body?.to ?? '').replace(/(.{2}).*(@.*)/, '$1***$2');
    await logActivity({ req, action: 'test_email', module: 'settings', description: `Gửi email thử thất bại (${e.code || 'SMTP_ERROR'}) đến ${maskedTo}`, success: false }).catch(() => {});
    const status = e?.statusCode || 500;
    const safe = ['SMTP_CONFIG_MISSING', 'SMTP_CONFIG_INVALID', 'SMTP_RECIPIENT_REJECTED', 'EAUTH'].includes(e.code)
      ? e.message
      : 'Không gửi được email. Kiểm tra cấu hình SMTP trong file backend/.env.';
    res.status(status).json({ success: false, message: safe });
  }
}
