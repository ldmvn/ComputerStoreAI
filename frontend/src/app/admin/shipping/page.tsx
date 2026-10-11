'use client';
import AdminGuard from '@/components/admin/AdminGuard';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, X, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { adminListOrders, adminUpdateShipping, type AdminOrder } from '@/services/adminSales.service';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order.type';

export default function AdminShippingPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [editing, setEditing] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingProvider, setShippingProvider] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const result = await adminListOrders(token, {
        page, limit,
        status: 'SHIPPING',
        search: search || undefined,
      });
      setOrders(result.orders);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally { setLoading(false); }
  }, [token, page, limit, search]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const clearSearch = () => { setSearchInput(''); setPage(1); setSearch(''); };

  const startEdit = (order: AdminOrder) => {
    setEditing(order.id);
    setTrackingNumber(order.trackingNumber ?? '');
    setShippingProvider(order.shippingProvider ?? '');
  };

  const saveShipping = async (orderId: number) => {
    if (!token) return;
    setSavingId(orderId);
    try {
      await adminUpdateShipping(token, orderId, { trackingNumber, shippingProvider });
      setMessage('Đã cập nhật thông tin vận chuyển.');
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật thất bại.');
    } finally { setSavingId(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminGuard permission="orders:manage">
    <section>
      <AdminPageHeader title="Vận chuyển" />
      <AdminFeedback message={message} error={error} />

      <p className="mb-4 text-sm text-slate-500">Hiển thị các đơn hàng đang trong trạng thái giao hàng.</p>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ID đơn, tên khách..."
            aria-label="Tìm kiếm vận chuyển"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {searchInput && <button onClick={clearSearch}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
          <button onClick={handleSearch} className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">Tìm</button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-14 text-center shadow-sm">
            <Truck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">Không có đơn hàng đang giao.</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">Đơn #{order.id}</p>
                <p className="text-sm text-slate-500">{order.shippingName} · {order.shippingPhone}</p>
                <p className="text-xs text-slate-400 mt-0.5">{order.shippingAddress}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                {order.trackingNumber ? (
                  <p className="mt-1 text-xs">
                    <span className="font-medium text-slate-700">{order.shippingProvider}</span>
                    {' — '}
                    <span className="font-mono text-slate-600">{order.trackingNumber}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-600">Chưa có mã vận đơn</p>
                )}
              </div>
            </div>

            {editing === order.id ? (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                <div className="flex-1 min-w-[140px]">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Đơn vị vận chuyển</label>
                  <input
                    value={shippingProvider}
                    onChange={e => setShippingProvider(e.target.value)}
                    placeholder="VD: GHTK, GHN..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Mã vận đơn</label>
                  <input
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="Mã tracking..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={savingId === order.id}
                    onClick={() => saveShipping(order.id)}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {savingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Lưu'}
                  </button>
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hủy</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startEdit(order)}
                className="mt-3 text-xs font-semibold text-primary-600 hover:underline"
              >Cập nhật tracking</button>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} đơn đang giao</p>
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
