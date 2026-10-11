'use client';
import { useEffect, useState, useCallback, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Search, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import {
  adminListOrders, adminGetOrderStats, adminUpdateOrderStatus,
  type AdminOrder, type AdminOrderStats,
} from '@/services/adminSales.service';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice as fmt } from '@/lib/product';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order.type';

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

export default function AdminOrdersPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<AdminOrderStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;

  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const confirmAction = useConfirm();
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [result, statsData] = await Promise.all([
        adminListOrders(token, { page, limit, status: statusFilter || undefined, search: search || undefined }),
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
  }, [token, page, limit, statusFilter, search]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const clearSearch = () => { setSearchInput(''); setPage(1); setSearch(''); };

  const handleAdvance = async (order: AdminOrder) => {
    const next = STATUS_NEXT[order.status as OrderStatus];
    if (!next || !token) return;
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
    if (!token) return;
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

  const totalPages = Math.ceil(total / limit);

  return (
    <section>
      <AdminPageHeader title="Đơn hàng" />
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm min-w-[180px]">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ID đơn, tên, SĐT..."
            aria-label="Tìm kiếm đơn hàng"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {searchInput && <button onClick={clearSearch}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
          <button onClick={handleSearch} className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">Tìm</button>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">Tổng tiền</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => {
                const next = STATUS_NEXT[order.status as OrderStatus];
                const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';
                const isExpanded = expanded === order.id;
                return (
                  <Fragment key={order.id}>
                    <tr className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="flex items-center gap-1 font-semibold text-slate-800 hover:text-primary-700">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          #{order.id}
                        </button>
                        <p className="mt-0.5 text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <p className="font-medium text-slate-700">{order.user?.fullName ?? order.shippingName}</p>
                        <p className="text-xs text-slate-400">{order.shippingPhone}</p>
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
                        <div className="flex items-center justify-end gap-1.5">
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
                            <button
                              disabled={actionLoading === order.id}
                              onClick={() => handleCancel(order)}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >Hủy</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.id}-detail`}>
                        <td colSpan={5} className="bg-slate-50 px-6 py-4">
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
