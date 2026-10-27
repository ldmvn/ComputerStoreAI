'use client';
import { useEffect, useState, useCallback, Fragment } from 'react';
import Image from 'next/image';
import { Loader2, Search, ChevronLeft, ChevronRight, X, ChevronDown, BadgeCheck, Landmark, Banknote, MoreHorizontal } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import {
  adminListOrders, adminGetOrderStats, adminUpdateOrderStatus,
  type AdminOrder, type AdminOrderStats,
} from '@/services/adminSales.service';
import { adminConfirmPayment, adminConfirmCodPayment, adminConfirmPaymentAndApprove } from '@/services/payment.service';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice as fmt } from '@/lib/product';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order.type';
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from '@/types/payment.type';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: 'COD',
  BANK_TRANSFER: 'VietQR',
  MOMO: 'MoMo',
  VNPAY: 'VNPAY',
};

const PAYMENT_METHOD_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả phương thức' },
  { value: 'COD', label: 'COD' },
  { value: 'BANK_TRANSFER', label: 'VietQR' },
  { value: 'MOMO', label: 'MoMo' },
  { value: 'VNPAY', label: 'VNPAY' },
];

const PAYMENT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả thanh toán' },
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'AWAITING_VERIFICATION', label: 'Chờ xác minh' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  AWAITING_VERIFICATION: 'bg-amber-50 text-amber-700',
  PROCESSING: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-slate-100 text-slate-600',
  REFUNDED: 'bg-slate-100 text-slate-600',
};

const STATUSES: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PENDING:   { status: 'CONFIRMED', label: 'Xác nhận' },
  CONFIRMED: { status: 'SHIPPING',  label: 'Bắt đầu giao' },
  SHIPPING:  { status: 'DELIVERED', label: 'Đã giao xong' },
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  SHIPPING:  'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

function PaymentBadge({ status }: { status: PaymentStatus | null }) {
  if (!status) {
    return <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Chưa có dữ liệu</span>;
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="inline-block rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {PAYMENT_METHOD_LABEL[method] ?? method}
    </span>
  );
}

export default function AdminOrdersPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<AdminOrderStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const confirmAction = useConfirm();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (menuOpenId === null) return;
    const close = () => setMenuOpenId(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpenId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, statsData] = await Promise.all([
        adminListOrders(token, {
          page, limit, status: statusFilter || undefined, search: search || undefined,
          paymentMethod: paymentMethodFilter || undefined, paymentStatus: paymentStatusFilter || undefined,
        }),
        adminGetOrderStats(token),
      ]);
      setOrders(result.orders);
      setTotal(result.total);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, statusFilter, paymentMethodFilter, paymentStatusFilter, search]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const clearSearch = () => { setSearchInput(''); setPage(1); setSearch(''); };

  const handleAdvance = async (order: AdminOrder) => {
    const next = STATUS_NEXT[order.status as OrderStatus];
    if (!next) return;
    setActionLoading(order.id);
    setMessage('');
    try {
      await adminUpdateOrderStatus(token, order.id, { status: next.status });
      setMessage(`Đơn #${order.id} → ${ORDER_STATUS_LABEL[next.status]}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (order: AdminOrder) => {
    const ok = await confirmAction({ title: 'Hủy đơn hàng', description: `Hủy đơn hàng #${order.id}? Hành động này không thể hoàn tác.`, destructive: true });
    if (!ok) return;
    setActionLoading(order.id);
    try {
      await adminUpdateOrderStatus(token, order.id, { status: 'CANCELLED' });
      setMessage(`Đã hủy đơn #${order.id}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hủy thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmPayment = async (order: AdminOrder) => {
    const ok = await confirmAction({
      title: 'Xác nhận đã nhận tiền',
      description: [
        `Mã đơn hàng: #${order.id}`,
        `Phương thức: ${PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}`,
        `Số tiền: ${fmt(order.payment?.amount ?? (order.subtotal - order.discountAmount))}`,
        '',
        '⚠️ Vui lòng kiểm tra thực tế đã nhận được tiền trên sao kê ngân hàng trước khi xác nhận. Thao tác này tách biệt với việc xác nhận đơn hàng.',
      ].join('\n'),
      confirmLabel: 'Xác nhận đã nhận tiền',
    });
    if (!ok) return;
    setActionLoading(order.id);
    try {
      const res = await adminConfirmPayment(order.id, token);
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xác nhận thanh toán thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmPaymentAndApprove = async (order: AdminOrder) => {
    const payment = order.payment;
    const attempt = payment?.attempts[0];
    const ok = await confirmAction({
      title: 'Xác nhận tiền & duyệt đơn',
      description: [
        `Mã đơn hàng: #${order.id}`,
        `Khách hàng: ${order.user?.fullName ?? order.shippingName}`,
        `Số tiền cần nhận: ${fmt(payment?.amount ?? (order.subtotal - order.discountAmount))}`,
        `Ngân hàng thụ hưởng: ${attempt?.bankName ?? 'MB Bank'} — ${attempt?.bankAccountNumber ?? ''} (${attempt?.bankAccountName ?? ''})`,
        `Nội dung chuyển khoản: ${attempt?.transferContent ?? ''}`,
        `Trạng thái thanh toán hiện tại: ${payment ? PAYMENT_STATUS_LABEL[payment.status] : '—'}`,
        '',
        '⚠️ Chỉ xác nhận khi đã kiểm tra tiền thực nhận tại MB Bank. Việc khách bấm "Tôi đã chuyển khoản" không phải bằng chứng đã nhận tiền.',
      ].join('\n'),
      confirmLabel: 'Xác nhận tiền & duyệt đơn',
    });
    if (!ok) return;
    setActionLoading(order.id);
    try {
      const res = await adminConfirmPaymentAndApprove(order.id, token);
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xác nhận tiền & duyệt đơn thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmCod = async (order: AdminOrder) => {
    const ok = await confirmAction({
      title: 'Xác nhận đã thu tiền COD',
      description: [
        `Mã đơn hàng: #${order.id}`,
        `Phương thức: ${PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}`,
        `Số tiền: ${fmt(order.payment?.amount ?? (order.subtotal - order.discountAmount))}`,
        '',
        '⚠️ Vui lòng kiểm tra thực tế đã thu tiền mặt từ khách trước khi xác nhận. Thao tác này tách biệt với việc xác nhận đơn hàng.',
      ].join('\n'),
      confirmLabel: 'Xác nhận đã thu tiền',
    });
    if (!ok) return;
    setActionLoading(order.id);
    try {
      const res = await adminConfirmCodPayment(order.id, token);
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xác nhận thu tiền COD thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <section>
      <AdminPageHeader title="Đơn hàng" description="Quản lý đơn hàng và thanh toán trong cùng một nơi." />
      <AdminFeedback message={message} error={error} />

      {/* Stats strip */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            { label: 'Chờ xác nhận', value: stats.pending, color: 'text-amber-600' },
            { label: 'Đã xác nhận', value: stats.confirmed, color: 'text-blue-600' },
            { label: 'Đang giao', value: stats.shipping, color: 'text-indigo-600' },
            { label: 'Đã giao', value: stats.delivered, color: 'text-emerald-600' },
            { label: 'Đã hủy', value: stats.cancelled, color: 'text-red-500' },
          ] as const).map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm min-w-[200px]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Mã đơn, tên khách, số điện thoại..."
              aria-label="Tìm kiếm đơn hàng"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {searchInput && <button onClick={clearSearch}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
            <button onClick={handleSearch} className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">Tìm</button>
          </div>
          <select
            value={paymentMethodFilter}
            onChange={e => { setPaymentMethodFilter(e.target.value); setPage(1); }}
            aria-label="Lọc theo phương thức thanh toán"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm outline-none"
          >
            {PAYMENT_METHOD_FILTERS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={paymentStatusFilter}
            onChange={e => { setPaymentStatusFilter(e.target.value); setPage(1); }}
            aria-label="Lọc theo trạng thái thanh toán"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm outline-none"
          >
            {PAYMENT_STATUS_FILTERS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value as OrderStatus | ''); setPage(1); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${statusFilter === s.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">Không có đơn hàng nào.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Đơn hàng</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Khách hàng</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Phương thức</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Thanh toán</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái đơn</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">Tổng tiền</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => {
                const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';
                const isExpanded = expanded === order.id;
                const payment = order.payment;
                const latestAttempt = payment?.attempts[0] ?? null;

                // Payment-before-fulfillment: BANK_TRANSFER/MOMO/VNPAY must
                // be PAID before the order can be approved or shipped; COD
                // is the deliberate exception (mirrors the backend guard in
                // adminOrder.service.js's updateOrderStatus()).
                const isGatedMethod = order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'MOMO' || order.paymentMethod === 'VNPAY';
                const paymentPaid = payment?.status === 'PAID';
                const paymentPendingish = payment?.status === 'PENDING' || payment?.status === 'AWAITING_VERIFICATION';

                // VietQR: one merged action while still PENDING — no separate "duyệt" button.
                const canMergeConfirmApprove = order.status === 'PENDING' && order.paymentMethod === 'BANK_TRANSFER' && paymentPendingish;
                // VietQR: legacy exception — order already moved past PENDING without ever being paid.
                const canStandaloneConfirmVietQR = order.status !== 'PENDING' && order.status !== 'CANCELLED' && order.paymentMethod === 'BANK_TRANSFER' && paymentPendingish;
                const canConfirmCod = !!payment && payment.status === 'PENDING' && order.paymentMethod === 'COD';
                // MoMo/VNPAY unpaid: no action Admin can take — only the payment gateway's IPN can settle it.
                const awaitingGatewayPayment = order.status === 'PENDING' && (order.paymentMethod === 'MOMO' || order.paymentMethod === 'VNPAY') && !paymentPaid;

                // The plain order-status advance button is suppressed exactly
                // when it would hit the backend guard (gated method, not yet
                // PAID) — the merge/standalone confirm buttons above take its place.
                const nextRaw = STATUS_NEXT[order.status as OrderStatus];
                const advanceBlockedByPayment = !!nextRaw && (nextRaw.status === 'CONFIRMED' || nextRaw.status === 'SHIPPING') && isGatedMethod && !paymentPaid;
                const next = advanceBlockedByPayment ? undefined : nextRaw;
                return (
                  <Fragment key={order.id}>
                    <tr className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="flex items-center gap-1 font-semibold text-slate-800 hover:text-primary-700">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          #{order.id}
                        </button>
                        <p className="mt-0.5 text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                        {/* Compact method + payment badges on mobile, where the dedicated columns are hidden. */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:hidden">
                          <MethodBadge method={order.paymentMethod} />
                          <PaymentBadge status={payment?.status ?? null} />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <p className="font-medium text-slate-700">{order.user?.fullName ?? order.shippingName}</p>
                        <p className="text-xs text-slate-400">{order.shippingPhone}</p>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <MethodBadge method={order.paymentMethod} />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <PaymentBadge status={payment?.status ?? null} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[order.status as OrderStatus]}`}>
                          {ORDER_STATUS_LABEL[order.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                        <span className="font-semibold text-primary-700">{fmt(order.subtotal - order.discountAmount)}</span>
                        {order.discountAmount > 0 && (
                          <p className="text-xs text-green-600">-{fmt(order.discountAmount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {canMergeConfirmApprove && (
                            <button
                              type="button"
                              disabled={actionLoading === order.id}
                              onClick={() => handleConfirmPaymentAndApprove(order)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {actionLoading === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                              Xác nhận tiền & duyệt
                            </button>
                          )}
                          {canStandaloneConfirmVietQR && (
                            <button
                              type="button"
                              disabled={actionLoading === order.id}
                              onClick={() => handleConfirmPayment(order)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {actionLoading === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                              Xác nhận đã nhận tiền
                            </button>
                          )}
                          {awaitingGatewayPayment && (
                            <span className="text-xs font-medium italic text-slate-400">Chờ thanh toán</span>
                          )}
                          {canConfirmCod && (
                            <button
                              type="button"
                              disabled={actionLoading === order.id}
                              onClick={() => handleConfirmCod(order)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {actionLoading === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                              Đã thu COD
                            </button>
                          )}
                          {next && (
                            <button
                              disabled={actionLoading === order.id}
                              onClick={() => handleAdvance(order)}
                              className="rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                            >
                              {actionLoading === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : next.label}
                            </button>
                          )}
                          {canCancel && (
                            <div className="relative" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={actionLoading === order.id}
                                onClick={() => setMenuOpenId(menuOpenId === order.id ? null : order.id)}
                                title="Thao tác khác"
                                aria-label="Thao tác khác"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {menuOpenId === order.id && (
                                <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => { setMenuOpenId(null); handleCancel(order); }}
                                    className="flex w-full items-center px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Hủy đơn hàng
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.id}-detail`}>
                        <td colSpan={7} className="bg-slate-50 px-6 py-4">
                          <ul className="space-y-2">
                            {order.items.map(item => (
                              <li key={item.id} className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-white">
                                  {item.primaryImage && <Image src={mediaUrl(item.primaryImage)} alt={item.name} width={40} height={40} className="h-full w-full object-contain" />}
                                </div>
                                <span className="flex-1 text-sm text-slate-700">{item.name}</span>
                                <span className="tabular-nums text-sm text-slate-500">×{item.quantity}</span>
                                <span className="tabular-nums text-sm font-semibold text-slate-800">{fmt(item.price * item.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                            <span>Địa chỉ: {order.shippingName} · {order.shippingPhone} · {order.shippingAddress}</span>
                            {order.discountAmount > 0 && (
                              <span className="text-green-600">Giảm giá: -{fmt(order.discountAmount)}</span>
                            )}
                          </div>
                          {order.trackingNumber && (
                            <p className="mt-1 text-xs text-slate-500">Tracking: {order.shippingProvider} — {order.trackingNumber}</p>
                          )}

                          {/* Payment detail — intentionally independent of Order Status. */}
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            {!payment ? (
                              <p className="text-xs text-slate-400">Đơn hàng này chưa có dữ liệu thanh toán (tạo trước khi hệ thống Payment Module triển khai).</p>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <MethodBadge method={payment.method} />
                                  <span className="text-xs text-slate-500">Thanh toán: <PaymentBadge status={payment.status} /></span>
                                  {latestAttempt?.merchantReference && (
                                    <span className="text-xs text-slate-400">Mã GD: {latestAttempt.merchantReference}</span>
                                  )}
                                  {latestAttempt?.providerTransactionId && (
                                    <span className="text-xs text-slate-400">Mã provider: {latestAttempt.providerTransactionId}</span>
                                  )}
                                  {payment.paidAt && (
                                    <span className="text-xs text-slate-400">Xác nhận lúc: {new Date(payment.paidAt).toLocaleString('vi-VN')}</span>
                                  )}
                                </div>

                                {payment.method === 'BANK_TRANSFER' && latestAttempt && (
                                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                    <span className="inline-flex items-center gap-1 font-medium text-slate-700"><Landmark className="h-3.5 w-3.5" /> {latestAttempt.bankName ?? 'MB Bank'}</span>
                                    <span>STK: <strong className="font-semibold text-slate-800">{latestAttempt.bankAccountNumber}</strong></span>
                                    <span>Chủ TK: {latestAttempt.bankAccountName}</span>
                                    <span>Nội dung CK: <code className="rounded bg-slate-100 px-1.5 py-0.5">{latestAttempt.transferContent}</code></span>
                                    <span>Số tiền cần nhận: <strong className="font-semibold text-primary-700">{fmt(payment.amount)}</strong></span>
                                    {latestAttempt.reportedAt && (
                                      <span>Khách báo CK lúc: {new Date(latestAttempt.reportedAt).toLocaleString('vi-VN')}</span>
                                    )}
                                  </div>
                                )}

                                {payment.method === 'COD' && payment.status !== 'PAID' && (
                                  <p className="text-xs text-slate-400">Thu tiền khi giao hàng — chưa ghi nhận đã thanh toán. Dùng nút &quot;Đã thu COD&quot; ở cột Thao tác để xác nhận.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} đơn hàng</p>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-slate-600">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
