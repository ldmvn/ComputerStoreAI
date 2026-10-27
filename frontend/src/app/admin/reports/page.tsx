'use client';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, TrendingUp, ShoppingBag, PackageCheck, Users } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { adminGetReport, type ReportSummary } from '@/services/adminSales.service';
import { formatProductPrice } from '@/lib/product';
import { mediaUrl } from '@/services/http.client';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/types/order.type';

const PRESET_RANGES = [
  { label: '7 ngày', days: 7 },
  { label: '30 ngày', days: 30 },
  { label: '90 ngày', days: 90 },
];

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function SparkBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-px">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-primary-400 transition-all"
          style={{ height: `${Math.round((v / max) * 100)}%`, minHeight: v > 0 ? '2px' : '0' }}
        />
      ))}
    </div>
  );
}

export default function AdminReportsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preset, setPreset] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const from = useCustom ? customFrom : daysAgo(preset);
  const to = useCustom ? customTo : new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await adminGetReport(token, from || undefined, to || undefined);
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải báo cáo.');
    } finally { setLoading(false); }
  }, [token, from, to]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const sparkData = report?.dailyRevenue.map(d => d.revenue) ?? [];

  return (
    <section>
      <AdminPageHeader title="Báo cáo bán hàng" />
      <AdminFeedback error={error} />

      {/* Date range controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {PRESET_RANGES.map(r => (
          <button
            key={r.days}
            onClick={() => { setPreset(r.days); setUseCustom(false); }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${!useCustom && preset === r.days ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >{r.label}</button>
        ))}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input
            type="date"
            value={customFrom}
            onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-primary-400 sm:flex-none"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="date"
            value={customTo}
            onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-primary-400 sm:flex-none"
          />
          {useCustom && (
            <button onClick={load} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700">
              Xem
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
      ) : report ? (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Doanh thu</p>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-primary-700">{formatProductPrice(report.revenue.revenue)}</p>
              <p className="mt-0.5 text-xs text-slate-400">từ đơn đã giao</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Đơn đã giao</p>
                <PackageCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">{report.revenue.deliveredOrders}</p>
              <p className="mt-0.5 text-xs text-slate-400">đơn hoàn thành</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tổng đơn hàng</p>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">
                {Object.values(report.revenue.statusBreakdown).reduce((s, v) => s + v.count, 0)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">mọi trạng thái</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Khách hàng mới</p>
                <Users className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">{report.newCustomers}</p>
              <p className="mt-0.5 text-xs text-slate-400">đăng ký mới</p>
            </div>
          </div>

          {/* Revenue chart */}
          {sparkData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-800">Doanh thu theo ngày</p>
              <SparkBar values={sparkData} />
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>{report.dailyRevenue[0]?.date}</span>
                <span>{report.dailyRevenue[report.dailyRevenue.length - 1]?.date}</span>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Status breakdown */}
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-800">Phân bổ đơn hàng</p>
              <ul className="space-y-2">
                {Object.entries(report.revenue.statusBreakdown).map(([status, data]) => (
                  <li key={status} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{ORDER_STATUS_LABEL[status as OrderStatus] ?? status}</span>
                    <span className="tabular-nums font-semibold text-slate-800">{data.count} đơn</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top products */}
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-800">Sản phẩm bán chạy</p>
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
              ) : (
                <ul className="space-y-3">
                  {report.topProducts.slice(0, 8).map((p, i) => (
                    <li key={p.productId} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{i + 1}</span>
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                        {p.primaryImage && (
                          <Image src={mediaUrl(p.primaryImage)} alt={p.name} width={36} height={36} className="h-full w-full object-contain" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.name}</span>
                      <span className="shrink-0 tabular-nums text-xs font-semibold text-primary-700">×{p.totalQuantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
