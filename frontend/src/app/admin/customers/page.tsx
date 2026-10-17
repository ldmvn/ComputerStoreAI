'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Search, X, ChevronLeft, ChevronRight,
  Users, ShoppingBag, UserCheck, UserMinus, ExternalLink,
  ChevronDown, ArrowUpDown, PackageOpen,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import {
  adminGetCustomerStats, adminListCustomers, adminGetCustomer,
  type AdminCustomer, type AdminCustomerDetail,
  type CustomerFilter, type CustomerSortBy,
} from '@/services/adminSales.service';
import { formatProductPrice } from '@/lib/product';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order.type';

// ── Constants ──────────────────────────────────────────────────────────────────

const FILTER_TABS: { value: CustomerFilter; label: string }[] = [
  { value: 'all',        label: 'Tất cả' },
  { value: 'no_orders',  label: 'Chưa mua hàng' },
  { value: 'has_orders', label: 'Đã đặt hàng' },
  { value: 'returning',  label: 'Quay lại' },
];

const SORT_OPTIONS: { value: CustomerSortBy; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'orders', label: 'Nhiều đơn nhất' },
  { value: 'spent',  label: 'Chi tiêu cao nhất' },
];

const ORDER_STATUS_COLOR: Partial<Record<OrderStatus, string>> = {
  PENDING:   'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  SHIPPING:  'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

function initials(name: string) {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

// ── Customer Detail Modal ──────────────────────────────────────────────────────

function CustomerModal({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const token = useAuthStore(s => s.token);
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    adminGetCustomer(token, customerId)
      .then(setDetail)
      .catch(e => setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.'))
      .finally(() => setLoading(false));
  }, [token, customerId]);

  const headerContent = detail ? (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-base font-bold text-primary-700">
        {initials(detail.fullName)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-slate-900">{detail.fullName}</p>
          <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${detail.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {detail.isActive ? 'Hoạt động' : 'Bị khóa'}
          </span>
        </div>
        <p className="truncate text-sm text-slate-500">{detail.email}{detail.phone ? ` · ${detail.phone}` : ''}</p>
        <p className="text-xs text-slate-400">Đăng ký {fmtDate(detail.createdAt)}</p>
      </div>
    </div>
  ) : (
    <p className="font-semibold text-slate-900">Chi tiết khách hàng</p>
  );

  return (
    <Modal title="Chi tiết khách hàng" onClose={onClose} size="lg" customHeader={headerContent} scrollableBody>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : detail ? (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Tổng đơn hàng', value: String(detail.totalOrders) },
              { label: 'Đơn hoàn thành', value: String(detail.deliveredOrders) },
              { label: 'Tổng chi tiêu', value: formatProductPrice(detail.totalSpent) },
              { label: 'Lần mua gần nhất', value: fmtDate(detail.lastOrderAt) },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-slate-800">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Order history */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Lịch sử đơn hàng</h3>
            {detail.orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <PackageOpen className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">Khách hàng chưa có đơn hàng nào.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mã đơn</th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Ngày đặt</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.orders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-semibold text-slate-800">#{o.id}</td>
                        <td className="hidden px-4 py-2.5 text-xs text-slate-500 sm:table-cell">{fmtDate(o.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLOR[o.status as OrderStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                            {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary-700">
                          {formatProductPrice(o.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminCustomersPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [stats, setStats] = useState<{ total: number; newCount: number; withOrders: number; withoutOrders: number } | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [sortBy, setSortBy] = useState<CustomerSortBy>('newest');
  const [showSort, setShowSort] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [result, statsData] = await Promise.all([
        adminListCustomers(token, { page, limit, search: search || undefined, filter, sortBy }),
        adminGetCustomerStats(token),
      ]);
      setCustomers(result.customers);
      setTotal(result.total);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách khách hàng.');
    } finally { setLoading(false); }
  }, [token, page, limit, search, filter, sortBy]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const clearSearch = () => { setSearchInput(''); setPage(1); setSearch(''); };

  const handleFilter = (f: CustomerFilter) => { setFilter(f); setPage(1); };
  const handleSort = (s: CustomerSortBy) => { setSortBy(s); setPage(1); setShowSort(false); };

  const totalPages = Math.ceil(total / limit);
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sắp xếp';

  return (
    <section>
      <AdminPageHeader title="Khách hàng" />
      <AdminFeedback error={error} />

      {/* Stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tổng khách hàng', value: stats.total, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Khách hàng mới', value: stats.newCount, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Đã đặt hàng', value: stats.withOrders, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Chưa mua hàng', value: stats.withoutOrders, icon: UserMinus, color: 'text-amber-600', bg: 'bg-amber-100' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Search + sort row */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm tên, email, SĐT..."
              aria-label="Tìm kiếm khách hàng"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {searchInput && (
              <button onClick={clearSearch}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>
            )}
            <button onClick={handleSearch} className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">
              Tìm
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSort(opt.value)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${sortBy === opt.value ? 'font-semibold text-primary-700' : 'text-slate-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleFilter(tab.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${filter === tab.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {tab.label}
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
        ) : customers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">
              {search || filter !== 'all' ? 'Không có kết quả phù hợp.' : 'Chưa có khách hàng nào.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">Ngày đăng ký</th>
                  <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Đơn hàng</th>
                  <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">Chi tiêu</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 xl:table-cell">Lần mua gần nhất</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                          {initials(c.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{c.fullName}</p>
                          <p className="truncate text-xs text-slate-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">{fmtDate(c.createdAt)}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-700 sm:table-cell">
                      {c.orderCount === 0
                        ? <span className="text-slate-400">0</span>
                        : c.orderCount}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums font-semibold text-primary-700 lg:table-cell">
                      {c.totalSpent === 0 ? <span className="font-normal text-slate-400">—</span> : formatProductPrice(c.totalSpent)}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-500 xl:table-cell">
                      {fmtDate(c.lastOrderAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {c.isActive ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} khách hàng</p>
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

      {/* Detail modal */}
      {selectedId !== null && (
        <CustomerModal customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </section>
  );
}
