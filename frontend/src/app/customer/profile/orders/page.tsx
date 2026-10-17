'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  RotateCcw,
  Package,
  AlertCircle,
  X,
  SlidersHorizontal,
  PackageCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  getMyOrders,
  getOrderStats,
  cancelOrder,
  OrderRequestError,
  type OrderFilters,
} from '@/services/order.service';
import { mediaUrl } from '@/services/http.client';
import type { Order, OrderStats, OrderStatus } from '@/types/order.type';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Chờ xác nhận', color: 'text-amber-700 bg-amber-50 border-amber-200',    icon: Clock        },
  CONFIRMED: { label: 'Chờ lấy hàng', color: 'text-blue-700 bg-blue-50 border-blue-200',       icon: PackageCheck },
  SHIPPING:  { label: 'Đang giao',    color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: Truck        },
  DELIVERED: { label: 'Hoàn thành',   color: 'text-green-700 bg-green-50 border-green-200',    icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy',       color: 'text-slate-600 bg-slate-100 border-slate-200',   icon: XCircle      },
};

const TABS: {
  value: string;
  label: string;
  icon: React.ElementType;
  statsKey?: keyof Pick<OrderStats, 'total' | 'pending' | 'waitingPickup' | 'shipping' | 'completed' | 'cancelled'>;
}[] = [
  { value: '',          label: 'Tất cả',       icon: SlidersHorizontal, statsKey: 'total'         },
  { value: 'PENDING',   label: 'Chờ xác nhận', icon: Clock,             statsKey: 'pending'       },
  { value: 'CONFIRMED', label: 'Chờ lấy hàng', icon: PackageCheck,      statsKey: 'waitingPickup' },
  { value: 'SHIPPING',  label: 'Đang giao',    icon: Truck,             statsKey: 'shipping'      },
  { value: 'DELIVERED', label: 'Hoàn thành',   icon: CheckCircle2,      statsKey: 'completed'     },
  { value: 'CANCELLED', label: 'Đã hủy',       icon: XCircle,           statsKey: 'cancelled'     },
];

const LIMIT = 10;

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, onCancel, cancelling, cancelError }: {
  order: Order; onCancel: (id: number) => void; cancelling: boolean; cancelError?: string;
}) {
  const meta = STATUS_META[order.status];
  const StatusIcon = meta.icon;
  const canCancel = order.status === 'PENDING';
  const firstItems = order.items.slice(0, 3);
  const extra = order.items.length - 3;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate text-sm font-semibold text-slate-700">#{order.id}</span>
          <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.color}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
      </div>

      <div className="divide-y divide-slate-50 px-4">
        {firstItems.map((item) => (
          <div key={item.id} className="flex gap-3 py-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 sm:h-14 sm:w-14">
              {item.primaryImage ? (
                <Image src={mediaUrl(item.primaryImage)} alt={item.name} fill className="object-contain" sizes="56px" />
              ) : (
                <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {item.slug ? (
                <Link href={`/products/${item.slug}`}
                  className="line-clamp-1 text-sm font-medium text-slate-700 hover:text-primary-600">
                  {item.name}
                </Link>
              ) : (
                <p className="line-clamp-1 text-sm font-medium text-slate-700">{item.name}</p>
              )}
              <p className="mt-0.5 text-xs text-slate-500">{formatPrice(item.price)} × {item.quantity}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-800">
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>
        ))}
        {extra > 0 && <p className="py-2 text-xs text-slate-400">+{extra} sản phẩm khác</p>}
      </div>

      {cancelError && (
        <p className="flex items-center gap-1 border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {cancelError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="text-sm">
          <p className="font-bold tabular-nums text-primary-600">{formatPrice(order.subtotal - order.discountAmount)}</p>
          {order.discountAmount > 0 ? (
            <p className="text-xs text-slate-400">Tạm tính {formatPrice(order.subtotal)} &minus; giảm {formatPrice(order.discountAmount)}</p>
          ) : (
            <p className="text-xs text-slate-500">Tổng tiền</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <button onClick={() => onCancel(order.id)} disabled={cancelling}
              className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
              <X className="h-3.5 w-3.5" />
              {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          )}
          {(order.status === 'CONFIRMED' || order.status === 'SHIPPING') && (
            <div className="flex flex-col items-end gap-0.5">
              <button
                disabled
                title="Đơn hàng đang được xử lý, không thể hủy"
                className="inline-flex min-h-[2.75rem] cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400 opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Hủy đơn
              </button>
              <span className="text-[10px] text-slate-400">Đơn đang xử lý</span>
            </div>
          )}
          <Link href={`/customer/profile/orders/${order.id}`}
            className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
            Xem chi tiết <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const { user, token } = useAuthStore();

  const [stats, setStats]               = useState<OrderStats | null>(null);
  const [orders, setOrders]             = useState<Order[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const [activeTab, setActiveTab]     = useState(searchParams.get('status') ?? '');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirm = useConfirm();
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError]   = useState<{ orderId: number; message: string } | null>(null);

  const hasFilter = Boolean(activeTab || search);
  const totalPages = Math.ceil(total / LIMIT);

  const loadOrders = useCallback(async (filters: OrderFilters) => {
    setLoading(true); setError(null);
    try {
      const res = await getMyOrders(token, filters);
      setOrders(res.orders); setTotal(res.total);
    } catch (err: unknown) {
      if (err instanceof OrderRequestError && (err.status === 404 || err.status === 501)) {
        setOrders([]); setTotal(0);
      } else {
        setError(err instanceof OrderRequestError ? err.message : 'Không thể tải đơn hàng.');
      }
    } finally { setLoading(false); }
  }, [token]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try { const s = await getOrderStats(token); setStats(s); } catch { /* non-critical */ }
    finally { setStatsLoading(false); }
  }, [token]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    loadOrders({ status: activeTab || undefined, search: search || undefined, page, limit: LIMIT });
  }, [activeTab, search, page, loadOrders]);

  useEffect(() => {
    if (!cancelError) return;
    const t = setTimeout(() => setCancelError(null), 8000);
    return () => clearTimeout(t);
  }, [cancelError]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setSearch(val.trim());
    }, 400);
  };

  const clearFilters = () => { setActiveTab(''); setSearch(''); setSearchInput(''); setPage(1); };

  const handleCancel = async (orderId: number) => {
    const ok = await confirm({
      title: 'Hủy đơn hàng',
      description: `Bạn có chắc muốn hủy đơn hàng #${orderId}? Hành động này không thể hoàn tác.`,
      destructive: true,
    });
    if (!ok) return;
    setCancellingId(orderId); setCancelError(null);
    try {
      const { order: updated } = await cancelOrder(token, orderId);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (err: unknown) {
      setCancelError({ orderId, message: err instanceof OrderRequestError ? err.message : 'Không thể hủy đơn hàng.' });
    } finally { setCancellingId(null); }
  };

  if (!user) return null;

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
      <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
      <ChevronRight size={14} aria-hidden="true" />
      <Link href="/customer/profile" className="hover:text-primary-600">Tài khoản</Link>
      <ChevronRight size={14} aria-hidden="true" />
      <span className="text-slate-700">Đơn hàng của tôi</span>
    </nav>
  );

  return (
    <div className="space-y-4">
      {breadcrumb}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Đơn hàng của tôi</h1>
            <p className="text-sm text-slate-500">Quản lý và theo dõi đơn hàng</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 border-y border-slate-200 sm:grid-cols-4">
          {statsLoading ? (
            [1, 2, 3, 4].map((i, idx) => (
              <div key={i} className={`px-5 py-4 ${idx < 3 ? 'border-r border-slate-200' : ''}`}>
                <div className="h-7 w-12 animate-pulse rounded bg-slate-100" />
                <div className="mt-1.5 h-3.5 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))
          ) : (
            [
              { label: 'Tổng đơn',     value: String(stats?.total ?? 0)             },
              { label: 'Chờ lấy',      value: String(stats?.waitingPickup ?? 0)     },
              { label: 'Hoàn thành',   value: String(stats?.completed ?? 0)         },
              { label: 'Tổng giá trị', value: formatPrice(stats?.totalValue ?? 0) },
            ].map((s, idx) => (
              <div key={s.label} className={`px-5 py-4 ${idx < 3 ? 'border-r border-slate-200' : ''}`}>
                <dl className="flex flex-col-reverse">
                  <dt className="mt-0.5 text-xs text-slate-500">{s.label}</dt>
                  <dd className="text-2xl font-bold tabular-nums text-primary-600">{s.value}</dd>
                </dl>
              </div>
            ))
          )}
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="order-search" className="sr-only">Tìm kiếm đơn hàng</label>
            <input
              id="order-search"
              type="search"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Tìm theo mã đơn hàng, tên sản phẩm..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto border-b border-slate-100 scrollbar-none">
          <div className="flex min-w-max">
            {TABS.map((tab) => {
              const count = tab.statsKey ? (stats?.[tab.statsKey] ?? 0) : 0;
              const active = activeTab === tab.value;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => { setPage(1); setActiveTab(tab.value); }}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                  {statsLoading ? (
                    <span className="inline-block h-2.5 w-4 animate-pulse rounded bg-slate-200" aria-hidden="true" />
                  ) : (
                    <>
                      <span className={`text-xs tabular-nums ${active ? 'text-primary-600' : 'text-slate-500'}`} aria-hidden="true">
                        {count}
                      </span>
                      <span className="sr-only">({count} đơn)</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-red-300" />
              <p className="mt-3 text-sm text-slate-500">{error}</p>
              <button
                onClick={() => loadOrders({ status: activeTab || undefined, search: search || undefined, page, limit: LIMIT })}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Thử lại
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <ShoppingBag className="h-7 w-7 text-slate-300" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {hasFilter ? 'Không tìm thấy đơn hàng' : 'Bạn chưa có đơn hàng nào'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {hasFilter
                  ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                  : 'Hãy khám phá sản phẩm và đặt đơn hàng đầu tiên của bạn'}
              </p>
              {!hasFilter && (
                <Link href="/products"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
                  Mua sắm ngay
                </Link>
              )}
            </div>
          ) : (
            orders.map(order => (
              <OrderCard key={order.id} order={order}
                onCancel={handleCancel} cancelling={cancellingId === order.id}
                cancelError={cancelError?.orderId === order.id ? cancelError.message : undefined} />
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    page === p ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                Sau
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageContent />
    </Suspense>
  );
}
