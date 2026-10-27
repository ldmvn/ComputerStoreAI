import { apiRequest } from './http.client';
import type { Payment, PaymentAttempt } from '@/types/payment.type';

export const getVietQrInfo = (orderId: number, token: string | null) =>
  apiRequest<{ success: boolean; data: { payment: Payment; attempt: PaymentAttempt } }>(
    `/payments/orders/${orderId}/vietqr`, {}, token,
  );

export const reportBankTransfer = (orderId: number, token: string | null) =>
  apiRequest<{ success: boolean; data: { payment: Payment; attempt: PaymentAttempt }; message: string }>(
    `/payments/orders/${orderId}/report-transfer`, { method: 'POST' }, token,
  );

export const adminConfirmPayment = (orderId: number, token: string | null) =>
  apiRequest<{ success: boolean; data: { outcome: string }; message: string }>(
    `/admin/payments/orders/${orderId}/confirm`, { method: 'POST' }, token,
  );

export const adminConfirmCodPayment = (orderId: number, token: string | null) =>
  apiRequest<{ success: boolean; data: { outcome: string }; message: string }>(
    `/admin/payments/orders/${orderId}/confirm-cod`, { method: 'POST' }, token,
  );

export const adminConfirmPaymentAndApprove = (orderId: number, token: string | null) =>
  apiRequest<{ success: boolean; data: { outcome: string; orderApproved: boolean }; message: string }>(
    `/admin/payments/orders/${orderId}/confirm-and-approve`, { method: 'POST' }, token,
  );

// Customer-initiated — also doubles as "Thanh toán lại" (safe to call again
// while the order is still unpaid; each call creates a fresh VNPAY attempt).
export const createVnpayPayment = (orderId: number, token: string | null) =>
  apiRequest<{ success: boolean; data: { url: string; merchantReference: string } }>(
    `/payments/orders/${orderId}/vnpay`, { method: 'POST' }, token,
  );

// Called from the Return page right after VNPAY redirects the browser back
// — verifies the signature server-side (Hash Secret never leaves the
// Backend) and reports the REAL current Payment status, never a guess
// based on the Return URL alone. Public endpoint, no token required.
export const checkVnpayReturn = (queryString: string) =>
  apiRequest<{ success: boolean; data: { valid: boolean; orderId: number | null; amount: number | null; paymentStatus: string | null; attemptStatus: string | null; vnpayResponseCode: string | null } }>(
    `/payments/vnpay/return-check${queryString}`, {},
  );

// Customer-initiated MoMo payment — also doubles as "Thanh toán lại" (safe to
// call again while unpaid; each call creates a fresh MoMo transaction). Returns
// the hosted MoMo payUrl to redirect the browser to.
export const createMomoPayment = (orderId: number, token: string | null, momoType: 'wallet' | 'atm' = 'atm') =>
  apiRequest<{ success: boolean; data: { url: string; merchantReference: string; deeplink: string | null; qrCodeUrl: string | null } }>(
    `/payments/orders/${orderId}/momo`, { method: 'POST', body: JSON.stringify({ momoType }) }, token,
  );

// Called from the MoMo Return page after MoMo redirects back — verifies the
// signature server-side and reports the REAL current Payment status (never a
// guess from the redirect alone; PAID requires a verified IPN or Provider
// Query response). Public.
export const checkMomoReturn = (queryString: string) =>
  apiRequest<{ success: boolean; data: { valid: boolean; orderId: number | null; amount: number | null; paymentStatus: string | null; attemptStatus: string | null; momoResultCode: string | null } }>(
    `/payments/momo/return-check${queryString}`, {},
  );

// Actively ask the provider (VNPAY querydr / MoMo query) for the real
// transaction result and sync the Payment — used on the Order Detail page so a
// gateway payment syncs even if the IPN never arrived. PAID is still only set
// from the provider's verified query response, never the client.
export const reconcilePayment = (orderId: number, token: string | null) =>
  apiRequest<{ success: boolean; data: { reconciled: boolean; reason?: string; outcome?: string; paymentStatus: string | null; attemptStatus?: string | null } }>(
    `/payments/orders/${orderId}/reconcile`, { method: 'POST' }, token,
  );

// Builds the real VietQR image URL via the free, public img.vietqr.io
// service — no backend QR-generation dependency needed. `compact2` is the
// VietQR quick-link template (bank logo + QR only, no extra bank card art).
//
// Deliberately `.svg`, not `.png`: img.vietqr.io's `.png` path 301-redirects
// to the same `.svg` resource, and that redirect response itself carries no
// `Access-Control-Allow-Origin` header — only the final `.svg` target does.
// An `<img>` tag ignores CORS and follows the redirect fine either way, but
// `fetch()` (used by the "Tải mã QR" download button) enforces CORS on every
// hop and fails on the un-headered redirect with "Failed to fetch". Verified
// directly against the live service (curl + an in-browser fetch) — not a
// guess.
export function buildVietQrImageUrl(bankBin: string, accountNumber: string, amount: number, addInfo: string, accountName: string) {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo,
    accountName,
  });
  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.svg?${params.toString()}`;
}
