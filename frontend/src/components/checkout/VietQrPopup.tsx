'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Copy, Check, Download, Loader2, Clock, CheckCircle2, Landmark, RefreshCw, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import { getVietQrInfo, buildVietQrImageUrl } from '@/services/payment.service';
import { formatProductPrice } from '@/lib/product';
import type { Payment, PaymentAttempt, PaymentStatus } from '@/types/payment.type';

// Auto-verification polling cadence. The spec asks for 3–5s; 4s balances
// freshness against request volume. A payment is only ever confirmed by the
// SePay webhook writing PAID to the DB — this just re-reads that real status.
const POLL_INTERVAL_MS = 4000;
// Minimum gap between manual "Kiểm tra thanh toán" presses (anti-spam) — a
// press within this window of the last check is ignored (the auto-poll keeps
// running regardless, so nothing is missed).
const MANUAL_CHECK_COOLDOWN_MS = 2500;
// Client-side display hold for the QR. The backend does NOT enforce a payment
// deadline (no expiresAt column — see payment schema), so this is a soft hold
// derived from the real backend timestamp attempt.createdAt, NOT a server
// deadline. When it elapses the QR stays valid and we never declare failure —
// a bank transfer can still settle afterwards.
const QR_HOLD_MS = 15 * 60 * 1000;

const PENDING_STATUSES: PaymentStatus[] = ['PENDING', 'PROCESSING', 'AWAITING_VERIFICATION'];

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable — silently ignore, user can still select text manually */ }
  };
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Sao chép ${label.toLowerCase()}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-primary-600"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function VietQrPopup({
  orderId, payment, attempt, onClose, onPaid,
}: {
  orderId: number;
  payment: Payment;
  attempt: PaymentAttempt;
  onClose: () => void;
  /** Fired once the backend reports PAID — lets the parent refresh the order
   *  (status becomes CONFIRMED server-side) without a full page reload. */
  onPaid?: (payment: Payment, attempt: PaymentAttempt) => void;
}) {
  const token = useAuthStore(s => s.token);
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [localPayment, setLocalPayment] = useState(payment);
  const [localAttempt, setLocalAttempt] = useState(attempt);

  const isPaid = localPayment.status === 'PAID';

  // Soft hold countdown, derived from the real backend timestamp.
  const deadline = new Date(localAttempt.createdAt).getTime() + QR_HOLD_MS;
  const [now, setNow] = useState(() => Date.now());
  const remaining = deadline - now;
  const expired = remaining <= 0;

  // Refs that must survive re-renders without restarting the polling effect.
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const lastManualCheckRef = useRef(0);
  const paidHandledRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  const onCloseRef = useRef(onClose);
  onPaidRef.current = onPaid;
  onCloseRef.current = onClose;

  // One place that reads the REAL current status from the backend. Never sets
  // PAID itself — it only reflects what the DB already says (which only the
  // SePay webhook can turn into PAID). Returns the fetched status, or null on
  // an in-flight collision / network error (caller decides what to do).
  const fetchStatus = useCallback(async (): Promise<PaymentStatus | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    try {
      const res = await getVietQrInfo(orderId, token);
      if (!mountedRef.current) return null;
      setLocalPayment(res.data.payment);
      setLocalAttempt(res.data.attempt);
      if (res.data.payment.status === 'PAID' && !paidHandledRef.current) {
        paidHandledRef.current = true;
        toast.success('Thanh toán thành công', 'Đơn hàng của bạn đã được xác nhận.');
        onPaidRef.current?.(res.data.payment, res.data.attempt);
        // Auto-close shortly after showing the success state.
        setTimeout(() => { if (mountedRef.current) onCloseRef.current(); }, 2000);
      }
      return res.data.payment.status;
    } catch {
      return null; // network/transient — the loop simply tries again next tick
    } finally {
      inFlightRef.current = false;
    }
  }, [orderId, token, toast]);

  // Esc to close + lock body scroll.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Tick the countdown once per second.
  useEffect(() => {
    if (isPaid) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isPaid]);

  // Auto-verification polling. Runs while the popup is open and the payment is
  // still pending and the hold window hasn't elapsed. Recursive setTimeout
  // (not setInterval) + an in-flight guard guarantees no overlapping/duplicate
  // requests. Stops on PAID, on unmount/close, and when the hold window
  // elapses (the manual button still works after that).
  useEffect(() => {
    mountedRef.current = true;
    if (isPaid) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const loop = async () => {
      if (!active) return;
      const status = await fetchStatus();
      if (!active) return;
      if (status === 'PAID') return;              // settled — stop polling
      if (Date.now() >= deadline) return;         // hold elapsed — stop auto-poll
      timer = setTimeout(loop, POLL_INTERVAL_MS);
    };
    timer = setTimeout(loop, POLL_INTERVAL_MS);

    return () => { active = false; clearTimeout(timer); };
    // Restart only if the order identity changes; deadline is stable per attempt.
  }, [fetchStatus, isPaid, deadline]);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleManualCheck = async () => {
    const sinceLast = Date.now() - lastManualCheckRef.current;
    if (checking || inFlightRef.current || sinceLast < MANUAL_CHECK_COOLDOWN_MS) return;
    lastManualCheckRef.current = Date.now();
    setChecking(true);
    try {
      const status = await fetchStatus();
      if (mountedRef.current && status && status !== 'PAID') {
        toast.info('Chưa nhận được thanh toán', 'Nếu bạn vừa chuyển khoản, vui lòng đợi vài giây rồi kiểm tra lại.');
      }
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  };

  const qrUrl = localAttempt.bankBin && localAttempt.bankAccountNumber && localAttempt.bankAccountName
    ? buildVietQrImageUrl(localAttempt.bankBin, localAttempt.bankAccountNumber, localPayment.amount, localAttempt.transferContent ?? '', localAttempt.bankAccountName)
    : null;

  const handleDownload = async () => {
    if (!qrUrl) return;
    setDownloading(true);
    try {
      // A plain <a download> on a cross-origin image URL is ignored by most
      // browsers — fetch the image as a blob and download that instead.
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `vietqr-donhang-${orderId}.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Không tải được mã QR', 'Vui lòng thử lại hoặc chụp màn hình mã QR.');
    } finally {
      setDownloading(false);
    }
  };

  // Status banner across the top of the body.
  const statusBanner = isPaid ? (
    <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
      <CheckCircle2 className="h-5 w-5 shrink-0" /> Thanh toán thành công — đơn hàng đã được xác nhận. Đang đóng…
    </div>
  ) : expired ? (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
      <Clock className="h-5 w-5 shrink-0" />
      <span>Đã hết thời gian giữ mã. Nếu bạn đã chuyển khoản, giao dịch có thể vẫn đang được xử lý — bấm <strong>Kiểm tra thanh toán</strong>.</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-3 text-sm text-primary-700">
      <ShieldCheck className="h-5 w-5 shrink-0" />
      <span className="flex items-center gap-1.5">
        Hệ thống đang tự động kiểm tra thanh toán
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Thanh toán chuyển khoản VietQR">
      <div className="flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl lg:w-[1000px] lg:max-w-[calc(100vw-48px)]">
        {/* Fixed header — never scrolls away, regardless of body content length */}
        <div data-testid="vietqr-popup-header" className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Landmark className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Thanh toán chuyển khoản</h2>
              <p className="text-xs text-slate-500">Quét mã QR hoặc chuyển khoản theo thông tin bên dưới</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable body — status banner + QR + bank info + actions. Only this region scrolls. */}
        <div data-testid="vietqr-popup-body" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-5 pt-4 lg:px-6">{statusBanner}</div>

          {/* Stacked on mobile/tablet, horizontal 2-column from lg (≥1024px) */}
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:gap-0 lg:p-6">

            {/* Left column — QR (≈45%) */}
            <div className="flex flex-col items-center gap-3 lg:w-[45%] lg:border-r lg:border-slate-100 lg:pr-6">
              <div className={`relative rounded-xl border border-slate-200 bg-white p-3 ${isPaid ? 'opacity-40' : ''}`}>
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="Mã QR chuyển khoản VietQR" width={280} height={280} className="h-[220px] w-[220px] object-contain lg:h-[280px] lg:w-[280px]" />
                ) : (
                  <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-slate-400 lg:h-[280px] lg:w-[280px]">Không có dữ liệu QR</div>
                )}
                {isPaid && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                  </div>
                )}
              </div>

              {/* Countdown / hold timer — derived from the real attempt.createdAt */}
              {!isPaid && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className={`h-4 w-4 ${expired ? 'text-amber-500' : 'text-slate-400'}`} aria-hidden="true" />
                  {expired ? (
                    <span className="font-medium text-amber-600">Đã hết thời gian giữ mã</span>
                  ) : (
                    <span className="text-slate-500">Mã QR còn hiệu lực trong <span className="font-semibold tabular-nums text-slate-700">{fmtCountdown(remaining)}</span></span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleDownload}
                disabled={!qrUrl || downloading}
                className="flex h-11 w-full max-w-[280px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Tải mã QR
              </button>
            </div>

            {/* Right column — transfer info (≈55%) */}
            <div className="flex flex-col gap-2 lg:w-[55%] lg:pl-6">
              <CopyField label="Ngân hàng" value={localAttempt.bankName ?? 'MB Bank'} />
              <CopyField label="Số tài khoản" value={localAttempt.bankAccountNumber ?? ''} />
              <CopyField label="Chủ tài khoản" value={localAttempt.bankAccountName ?? ''} />
              <CopyField label="Nội dung chuyển khoản" value={localAttempt.transferContent ?? ''} />
              <div className="flex min-h-[56px] items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50/60 px-3.5 py-2.5">
                <p className="text-xs font-medium text-primary-600">Số tiền</p>
                <p className="text-xl font-bold tabular-nums text-primary-700">{formatProductPrice(localPayment.amount)}</p>
              </div>

              <p className="pt-1 text-xs leading-5 text-slate-500">
                Vui lòng chuyển khoản <strong>đúng số tiền</strong> và giữ nguyên <strong>nội dung chuyển khoản</strong> để hệ thống tự động xác nhận.
              </p>

              {/* Actions — "Kiểm tra thanh toán" (immediate status check). No
                  "Thanh toán sau" (the X in the header closes the popup). */}
              <div className="pt-2">
                {!isPaid && (
                  <button
                    type="button"
                    onClick={handleManualCheck}
                    disabled={checking}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {checking ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
