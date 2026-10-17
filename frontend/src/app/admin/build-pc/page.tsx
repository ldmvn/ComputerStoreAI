'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Cpu, Layers, ListChecks, Package, Sparkles, Wallet } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAuthStore } from '@/store/auth.store';
import { formatProductPrice } from '@/lib/product';
import {
  getBuildPcSummary, getDataIssues,
  type BuildPcSummary, type DataIssues,
} from '@/services/adminBuildPc.service';
import RulesTab from '@/components/admin/build-pc/RulesTab';
import PresetsTab from '@/components/admin/build-pc/PresetsTab';
import AttributesTab from '@/components/admin/build-pc/AttributesTab';
import SessionsTab from '@/components/admin/build-pc/SessionsTab';

type TabId = 'overview' | 'rules' | 'presets' | 'attributes' | 'sessions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'rules', label: 'Quy tắc tương thích' },
  { id: 'presets', label: 'Cấu hình mẫu' },
  { id: 'attributes', label: 'Thuộc tính' },
  { id: 'sessions', label: 'Lịch sử cấu hình' },
];

function KpiCard({ icon: Icon, label, value, hint, color }: { icon: typeof Cpu; label: string; value: string; hint?: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}><Icon className="h-4.5 w-4.5" /></div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-2.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function OverviewTab({ summary, issues, loading, onJump }: {
  summary: BuildPcSummary | null; issues: DataIssues | null; loading: boolean;
  onJump: (tab: TabId) => void;
}) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[108px] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
      </div>
    );
  }

  const issueCount = issues
    ? [
        issues.missingAttributesTotal > 0,
        issues.rulesWithMissingAttribute.length > 0,
        issues.presetsWithHiddenProducts.length > 0,
        issues.buildsWithUnavailableItems.length > 0,
      ].filter(Boolean).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={ListChecks} label="Tổng lượt tạo cấu hình" value={String(summary.totalBuilds)} color="bg-primary-50 text-primary-600" />
        <KpiCard icon={Wallet} label="Giá trị TB / cấu hình" value={formatProductPrice(summary.avgValue)} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={Layers} label="Tổng giá trị cấu hình" value={formatProductPrice(summary.totalValue)} color="bg-violet-50 text-violet-600" hint="toàn bộ lịch sử" />
        <KpiCard icon={Cpu} label="Linh kiện được chọn nhiều nhất" value={summary.topComponents[0]?.name ?? '—'} color="bg-amber-50 text-amber-600" hint={summary.topComponents[0] ? `${summary.topComponents[0].pickCount} lượt chọn` : undefined} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Top linh kiện được chọn nhiều nhất</h3>
        {summary.topComponents.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-2.5">
            {summary.topComponents.map((c, i) => (
              <li key={c.productId} className="flex items-center gap-3 text-sm">
                <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-slate-700">{c.name}</span>
                <span className="shrink-0 tabular-nums text-xs font-semibold text-primary-700">{c.pickCount} lượt</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cần xử lý */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-900">Cần xử lý {issueCount > 0 && <span className="ml-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs">{issueCount}</span>}</h3>
        </div>
        {!issues ? (
          <p className="text-sm text-slate-400">Đang tải...</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {issues.missingAttributesTotal > 0 && (
              <li>
                <button onClick={() => onJump('attributes')} className="text-left text-amber-800 underline-offset-2 hover:underline">
                  {issues.missingAttributesTotal} sản phẩm thiếu thuộc tính phục vụ Build PC
                </button>
              </li>
            )}
            {issues.rulesWithMissingAttribute.length > 0 && (
              <li>
                <button onClick={() => onJump('rules')} className="text-left text-amber-800 underline-offset-2 hover:underline">
                  {issues.rulesWithMissingAttribute.length} quy tắc tham chiếu thuộc tính không còn tồn tại
                </button>
              </li>
            )}
            {issues.presetsWithHiddenProducts.length > 0 && (
              <li>
                <button onClick={() => onJump('presets')} className="text-left text-amber-800 underline-offset-2 hover:underline">
                  {issues.presetsWithHiddenProducts.length} preset dùng sản phẩm đã ẩn/xóa
                </button>
              </li>
            )}
            {issues.buildsWithUnavailableItems.length > 0 && (
              <li>
                <button onClick={() => onJump('sessions')} className="text-left text-amber-800 underline-offset-2 hover:underline">
                  {issues.buildsWithUnavailableItems.length} cấu hình có linh kiện không còn bán
                </button>
              </li>
            )}
            {issueCount === 0 && <li className="flex items-center gap-1.5 text-emerald-700"><Sparkles className="h-4 w-4" /> Không có vấn đề nào cần xử lý.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminBuildPcPage() {
  const token = useAuthStore(s => s.token);
  const [tab, setTab] = useState<TabId>('overview');
  const [summary, setSummary] = useState<BuildPcSummary | null>(null);
  const [issues, setIssues] = useState<DataIssues | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i] = await Promise.all([getBuildPcSummary(token), getDataIssues(token)]);
      setSummary(s); setIssues(i);
    } catch { /* surfaced via empty state */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  return (
    <AdminGuard permission="build_pc:view">
      <section>
        <AdminPageHeader
          title="Build PC"
          description="Quản lý quy tắc tương thích, cấu hình mẫu và theo dõi dữ liệu Build PC. Không ảnh hưởng tới cách khách hàng tự chọn linh kiện."
        />

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50 p-1">
          {TABS.map(t => (
            <button
              key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab summary={summary} issues={issues} loading={loading} onJump={setTab} />}
        {tab === 'rules' && <RulesTab />}
        {tab === 'presets' && <PresetsTab />}
        {tab === 'attributes' && <AttributesTab />}
        {tab === 'sessions' && <SessionsTab />}
      </section>
    </AdminGuard>
  );
}
