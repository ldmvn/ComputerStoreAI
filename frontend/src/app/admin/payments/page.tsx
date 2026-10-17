'use client';
import AdminGuard from '@/components/admin/AdminGuard';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { adminListOrders, type AdminOrder } from '@/services/adminSales.service';
import { formatProductPrice } from '@/lib/product';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order.type';

const PAYMENT_LABEL: Record<string, string> = {
  COD: 'COD',
  BANK_TRANSFER: 'Chuyển khoản',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  SHIPPING:  'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function AdminPaymentsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [paymentFilter, setPaymentFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await adminListOrders(token, {
        page, limit,
        paymentMethod: paymentFilter || undefined,
        search: search || undefined,
      });
      setOrders(result.orders);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally { setLoading(false); }
  }, [token, page, limit, paymentFilter, search]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const clearSearch = () => { setSearchInput(''); setPage(1); setSearch(''); };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminGuard permission="orders:view">
    <section>
      <AdminPageHeader title="Thanh toán" />
      <AdminFeedback error={error} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm min-w-[180px]">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ID đơn, tên khách..."
            aria-label="Tìm kiếm thanh toán"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {searchInput && <button onClick={clearSearch}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
          <button onClick={handleSearch} className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">Tìm</button>
        </div>
        <div className="flex gap-1.5">
          {([{ value: '', label: 'Tất cả' }, { value: 'COD', label: 'COD' }, { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }]).map(opt => (
            <button
              key={opt.value}
              onClick={() => { setPaymentFilter(opt.value); setPage(1); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${paymentFilter === opt.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div>
        ) : orders.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">Không có dữ liệu.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Đơn hàng</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Khách hàng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phương thức</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái đơn</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">#{o.id}</p>
                    <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="text-slate-700">{o.user?.fullName ?? o.shippingName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status as OrderStatus]}`}>
                      {ORDER_STATUS_LABEL[o.status as OrderStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary-700">
                    {formatProductPrice(o.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} giao dịch</p>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-sm text-slate-600">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </section>
    </AdminGuard>
  );
}
