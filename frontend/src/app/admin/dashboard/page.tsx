'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingCart, Wallet, Receipt, FileText, Users, PackageX,
  Clock, CheckCircle2, PackageCheck, Truck, CheckCheck, XCircle,
  TrendingUp, TrendingDown, Loader2, Headset, CreditCard, Banknote,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice } from '@/lib/product';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order.type';
import {
  getAdminDashboard, getRevenueTimeline, getCategoryRevenue,
  type DashboardData, type DashboardRange, type RevenuePoint, type CategoryRevenue,
} from '@/services/adminDashboard.service';
import RevenueChart from '@/components/admin/dashboard/RevenueChart';
import DonutChart, { type DonutSlice } from '@/components/admin/dashboard/DonutChart';
import HorizontalBarChart from '@/components/admin/dashboard/HorizontalBarChart';

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
  { value: 'month', label: 'Tháng hiện tại' },
  { value: '12m', label: '12 tháng qua' },
];

const STATUS_CARD: Record<OrderStatus, { icon: typeof Clock; bg: string; fg: string; label: string }> = {
  PENDING:   { icon: Clock,        bg: 'bg-amber-50',   fg: 'text-amber-700',   label: 'Chờ xác nhận' },
  CONFIRMED: { icon: CheckCircle2, bg: 'bg-blue-50',    fg: 'text-blue-700',    label: 'Đã xác nhận' },
  SHIPPING:  { icon: Truck,        bg: 'bg-indigo-50',  fg: 'text-indigo-700',  label: 'Đang giao' },
  DELIVERED: { icon: CheckCheck,   bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Hoàn thành' },
  CANCELLED: { icon: XCircle,      bg: 'bg-red-50',     fg: 'text-red-700',     label: 'Đã hủy' },
};

const STATUS_DONUT_COLOR: Record<OrderStatus, string> = {
  PENDING: '#f59e0b', CONFIRMED: '#3b82f6', SHIPPING: '#6366f1', DELIVERED: '#10b981', CANCELLED: '#ef4444',
};

function dateFmt(s: string) {
  return new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function ChangeBadge({ pct }: { pct?: number }) {
  if (pct === undefined) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function KpiCardSkeleton() {
  return <div className="h-[108px] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />;
}

function SectionCard({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [range, setRange] = useState<DashboardRange>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Doanh thu theo thời gian / theo danh mục có bộ chọn thời gian riêng
  const [revenueRange, setRevenueRange] = useState<DashboardRange>('7d');
  const [revenueTimeline, setRevenueTimeline] = useState<RevenuePoint[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const [categoryRange, setCategoryRange] = useState<DashboardRange>('30d');
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = range === 'custom' && customFrom && customTo
        ? { range, from: customFrom, to: customTo }
        : { range };
      const result = await getAdminDashboard(token, params);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  }, [token, range, customFrom, customTo]);

  const loadRevenueTimeline = useCallback(async () => {
    setRevenueLoading(true);
    try { setRevenueTimeline(await getRevenueTimeline(token, { range: revenueRange })); }
    catch { /* giữ dữ liệu cũ, không chặn phần còn lại của trang */ }
    finally { setRevenueLoading(false); }
  }, [token, revenueRange]);

  const loadCategoryRevenue = useCallback(async () => {
    setCategoryLoading(true);
    try { setCategoryRevenue(await getCategoryRevenue(token, { range: categoryRange })); }
    catch { /* giữ dữ liệu cũ, không chặn phần còn lại của trang */ }
    finally { setCategoryLoading(false); }
  }, [token, categoryRange]);

  useEffect(() => { if (isHydrated) void load(); }, [isHydrated, load]);
  useEffect(() => { if (isHydrated) void loadRevenueTimeline(); }, [isHydrated, loadRevenueTimeline]);
  useEffect(() => { if (isHydrated) void loadCategoryRevenue(); }, [isHydrated, loadCategoryRevenue]);

  const kpi = data?.kpi;
  const orderStatus = data?.orderStatus;

  const donutSlices: DonutSlice[] = orderStatus
    ? orderStatus.items.map(i => ({ label: STATUS_CARD[i.status].label, value: i.count, color: STATUS_DONUT_COLOR[i.status] }))
    : [];

  const categoryBars = categoryRevenue.map(c => ({ label: c.name, value: c.revenue }));

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Tổng quan"
        description="Chào mừng bạn trở lại! Đây là tổng quan hoạt động cửa hàng."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={range}
              onChange={e => setRange(e.target.value as DashboardRange)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none"
            >
              {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="date" value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setRange('custom'); }}
              className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-primary-400 focus:outline-none"
            />
            <span className="text-xs text-slate-400">—</span>
            <input
              type="date" value={customTo}
              onChange={e => { setCustomTo(e.target.value); setRange('custom'); }}
              className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-primary-400 focus:outline-none"
            />
          </div>
        }
      />

      <AdminFeedback error={error} />

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading || !kpi ? (
          Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50"><ShoppingCart className="h-4.5 w-4.5 text-primary-600" /></div>
                <p className="min-w-0 text-xs font-medium text-slate-500">Doanh thu hôm nay</p>
              </div>
              <p className="mt-2.5 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatProductPrice(kpi.todayRevenue.value)}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <ChangeBadge pct={kpi.todayRevenue.changePct} />
                <span className="text-xs text-slate-400">so với hôm qua</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50"><Wallet className="h-4.5 w-4.5 text-blue-600" /></div>
                <p className="min-w-0 text-xs font-medium text-slate-500">Doanh thu tháng này</p>
              </div>
              <p className="mt-2.5 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatProductPrice(kpi.monthRevenue.value)}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <ChangeBadge pct={kpi.monthRevenue.changePct} />
                <span className="text-xs text-slate-400">so với tháng trước</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50"><Receipt className="h-4.5 w-4.5 text-violet-600" /></div>
                <p className="min-w-0 text-xs font-medium text-slate-500">Tổng doanh thu</p>
              </div>
              <p className="mt-2.5 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatProductPrice(kpi.totalRevenue.value)}</p>
              <p className="mt-1 text-xs text-slate-400">toàn thời gian (đơn đã giao)</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><FileText className="h-4.5 w-4.5 text-slate-600" /></div>
                <p className="min-w-0 text-xs font-medium text-slate-500">Đơn hàng hôm nay</p>
              </div>
              <p className="mt-2.5 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{kpi.todayOrders.value}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <ChangeBadge pct={kpi.todayOrders.changePct} />
                <span className="text-xs text-slate-400">so với hôm qua</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50"><Users className="h-4.5 w-4.5 text-indigo-600" /></div>
                <p className="min-w-0 text-xs font-medium text-slate-500">Khách hàng mới</p>
              </div>
              <p className="mt-2.5 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{kpi.newCustomersToday.value}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <ChangeBadge pct={kpi.newCustomersToday.changePct} />
                <span className="text-xs text-slate-400">so với hôm qua</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50"><PackageX className="h-4.5 w-4.5 text-rose-600" /></div>
                <p className="min-w-0 text-xs font-medium text-slate-500">Sản phẩm sắp hết hàng</p>
              </div>
              <p className="mt-2.5 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{kpi.lowStockProducts.value}</p>
              <p className="mt-1 text-xs text-slate-400">cần nhập thêm hàng</p>
            </div>
          </>
        )}
      </div>

      {/* ── Order status row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading || !orderStatus ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[96px] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)
        ) : (
          orderStatus.items.map(item => {
            const cfg = STATUS_CARD[item.status];
            const Icon = cfg.icon;
            return (
              <Link
                key={item.status}
                href="/admin/orders"
                className={`rounded-xl border border-slate-200 ${cfg.bg} p-4 transition hover:shadow-sm`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${cfg.fg}`} />
                  <p className={`text-xs font-medium ${cfg.fg}`}>{cfg.label}</p>
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{item.count}</p>
                <span className={`mt-1 inline-block text-xs font-medium ${cfg.fg} underline-offset-2 hover:underline`}>Xem chi tiết →</span>
              </Link>
            );
          })
        )}
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard
          title="Doanh thu theo thời gian"
          className="md:col-span-2 xl:col-span-2"
          action={
            <select
              value={revenueRange}
              onChange={e => setRevenueRange(e.target.value as DashboardRange)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs focus:border-primary-400 focus:outline-none"
            >
              {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          }
        >
          {revenueLoading ? (
            <div className="flex h-[260px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <RevenueChart data={revenueTimeline} />
          )}
        </SectionCard>

        <SectionCard title="Cơ cấu trạng thái đơn hàng">
          {loading ? (
            <div className="flex h-[200px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <DonutChart slices={donutSlices} centerLabel="Tổng đơn" centerValue={orderStatus?.total ?? 0} />
          )}
        </SectionCard>

        <SectionCard
          title="Doanh thu theo danh mục"
          action={
            <select
              value={categoryRange}
              onChange={e => setCategoryRange(e.target.value as DashboardRange)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs focus:border-primary-400 focus:outline-none"
            >
              {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          }
        >
          {categoryLoading ? (
            <div className="flex h-[200px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <HorizontalBarChart items={categoryBars} />
          )}
        </SectionCard>
      </div>

      {/* ── Tables row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Đơn hàng mới nhất"
          className="lg:col-span-2"
          action={<Link href="/admin/orders" className="text-xs font-medium text-primary-600 hover:underline">Xem tất cả →</Link>}
        >
          {loading ? (
            <div className="flex h-[200px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : !data || data.recentOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Chưa có đơn hàng nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Mã đơn</th>
                    <th className="py-2 pr-3">Khách hàng</th>
                    <th className="py-2 pr-3 text-right">Tổng tiền</th>
                    <th className="py-2 pr-3">Trạng thái</th>
                    <th className="hidden py-2 pr-3 sm:table-cell">Thời gian</th>
                    <th className="py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recentOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 pr-3 font-medium text-slate-800">#DH{String(o.id).padStart(6, '0')}</td>
                      <td className="max-w-[140px] truncate py-2.5 pr-3 text-slate-600">{o.customerName}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{formatProductPrice(o.total)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CARD[o.status].bg} ${STATUS_CARD[o.status].fg}`}>
                          {ORDER_STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="hidden py-2.5 pr-3 text-xs text-slate-400 sm:table-cell">{dateFmt(o.createdAt)}</td>
                      <td className="py-2.5 text-right">
                        <Link href="/admin/orders" className="text-xs font-medium text-primary-600 hover:underline">Xem</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="min-w-0 space-y-4">
          <SectionCard title="Top sản phẩm bán chạy" action={<Link href="/admin/products" className="text-xs font-medium text-primary-600 hover:underline">Xem tất cả →</Link>}>
            {loading ? (
              <div className="flex h-[140px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : !data || data.topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>
            ) : (
              <ul className="space-y-3">
                {data.topProducts.map((p, i) => (
                  <li key={p.productId} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{i + 1}</span>
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                      {p.primaryImage && <Image src={mediaUrl(p.primaryImage)} alt={p.name} width={36} height={36} className="h-full w-full object-contain" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-700">{p.name}</p>
                      <p className="text-xs text-slate-400">Đã bán {p.quantitySold}</p>
                    </div>
                    <span className="shrink-0 tabular-nums text-xs font-semibold text-primary-700">{formatProductPrice(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Sản phẩm sắp hết hàng" action={<Link href="/admin/inventory" className="text-xs font-medium text-primary-600 hover:underline">Xem tất cả →</Link>}>
            {loading ? (
              <div className="flex h-[140px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : !data || data.lowStockProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Không có sản phẩm sắp hết hàng.</p>
            ) : (
              <ul className="space-y-3">
                {data.lowStockProducts.map(p => (
                  <li key={p.id} className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                      {p.image && <Image src={mediaUrl(p.image)} alt={p.name} width={36} height={36} className="h-full w-full object-contain" />}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.name}</p>
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{p.stockQuantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Customer & operations row ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Khách hàng">
          {loading || !data ? (
            <div className="flex h-[120px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400">Tổng khách hàng</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{data.customerStats.total.toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Khách mới hôm nay</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{data.customerStats.newToday}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Khách mới tháng này</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{data.customerStats.newThisMonth}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Đã mua hàng</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{data.customerStats.withOrders.toLocaleString('vi-VN')}</p>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top khách hàng theo chi tiêu" action={<Link href="/admin/accounts" className="text-xs font-medium text-primary-600 hover:underline">Xem tất cả →</Link>}>
          {loading ? (
            <div className="flex h-[120px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : !data || data.topCustomers.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.topCustomers.map(c => (
                <li key={c.userId} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-700">{c.fullName}</span>
                  <span className="shrink-0 px-2 text-xs text-slate-400">{c.orderCount} đơn</span>
                  <span className="shrink-0 tabular-nums font-semibold text-slate-800">{formatProductPrice(c.totalSpent)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Yêu cầu hỗ trợ" action={<Link href="/admin/support-tickets" className="text-xs font-medium text-primary-600 hover:underline">Xem tất cả →</Link>}>
          {loading || !data ? (
            <div className="flex h-[120px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-amber-50 py-2">
                  <p className="text-lg font-bold text-amber-700">{data.supportStats.waiting}</p>
                  <p className="text-[11px] text-amber-600">Chờ phản hồi</p>
                </div>
                <div className="rounded-lg bg-blue-50 py-2">
                  <p className="text-lg font-bold text-blue-700">{data.supportStats.inProgress}</p>
                  <p className="text-[11px] text-blue-600">Đang xử lý</p>
                </div>
                <div className="rounded-lg bg-emerald-50 py-2">
                  <p className="text-lg font-bold text-emerald-700">{data.supportStats.done}</p>
                  <p className="text-[11px] text-emerald-600">Hoàn thành</p>
                </div>
              </div>
              {data.supportStats.recent.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">Chưa có yêu cầu nào.</p>
              ) : (
                <ul className="space-y-2">
                  {data.supportStats.recent.map(t => (
                    <li key={t.id}>
                      <Link href={`/admin/support-tickets/${t.id}`} className="flex items-center gap-2 rounded-lg px-1 py-1 text-xs hover:bg-slate-50">
                        <Headset className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="shrink-0 font-medium text-slate-500">#{t.code}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-600">{t.category}</span>
                        <span className="shrink-0 text-slate-400">{dateFmt(t.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard title="Thanh toán">
          {loading || !data ? (
            <div className="flex h-[120px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : data.paymentStats.methods.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-3">
              {data.paymentStats.methods.map(m => (
                <div key={m.method}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      {m.method === 'COD' ? <Banknote className="h-3.5 w-3.5 text-slate-400" /> : <CreditCard className="h-3.5 w-3.5 text-slate-400" />}
                      {{ COD: 'Thanh toán khi nhận hàng', BANK_TRANSFER: 'Chuyển khoản ngân hàng', VNPAY: 'VNPay', MOMO: 'MoMo' }[m.method] ?? m.method}
                    </span>
                    <span className="tabular-nums text-slate-500">{m.count} đơn ({m.pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(2, m.pct)}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                <span className="text-slate-500">Đơn bị hủy trong kỳ</span>
                <span className="font-semibold text-red-600">{data.paymentStats.cancelled}</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </section>
  );
}
