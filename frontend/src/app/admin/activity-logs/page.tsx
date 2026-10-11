'use client';
import AdminGuard from '@/components/admin/AdminGuard';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import { type ActivityLog, getActivityLog, getActivityLogs } from '@/services/rbac.service';

const MODULES: Record<string, string> = {
  products: 'Sản phẩm', categories: 'Danh mục', brands: 'Thương hiệu', attributes: 'Thuộc tính',
  megamenu: 'Mega Menu', inventory: 'Kho', banners: 'Banner', product_sections: 'Khối SP',
  promotions: 'Khuyến mãi', reviews: 'Đánh giá', orders: 'Đơn hàng', customers: 'Khách hàng',
  returns: 'Đổi trả', reports: 'Báo cáo', build_pc: 'Build PC',
  administrators: 'Quản trị viên', roles: 'Vai trò', activity_logs: 'Nhật ký', auth: 'Xác thực',
};

export default function ActivityLogsPage() {
  const token = useAuthStore(s => s.token);
  const toast = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filterModule, setFilterModule] = useState('');
  const [filterSuccess, setFilterSuccess] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  const [detailLog, setDetailLog] = useState<ActivityLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getActivityLogs(token, {
        page: p, limit: 30,
        module: filterModule || undefined,
        success: filterSuccess !== '' ? filterSuccess === 'true' : undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        search: search || undefined,
      });
      setLogs(res.logs); setTotal(res.total); setPage(res.page); setTotalPages(res.totalPages);
    } catch { toast.error('Không tải được nhật ký.'); }
    finally { setLoading(false); }
  }, [token, filterModule, filterSuccess, filterFrom, filterTo, search, toast]);

  useEffect(() => { void load(1); }, [token, filterModule, filterSuccess, filterFrom, filterTo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (log: ActivityLog) => {
    if (!token) return;
    setDetailLoading(true); setDetailLog(log);
    try { const r = await getActivityLog(token, log.id); setDetailLog(r.log); }
    catch { toast.error('Không tải được chi tiết.'); }
    finally { setDetailLoading(false); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <AdminGuard permission="activity_logs:view">
    <section>
      <AdminPageHeader title="Nhật ký hoạt động" />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm email, mô tả..." className="h-9 rounded-lg border border-slate-200 px-3 text-sm w-52" />
        <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
          <option value="">Tất cả module</option>
          {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSuccess} onChange={e => setFilterSuccess(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
          <option value="">Tất cả kết quả</option>
          <option value="true">Thành công</option>
          <option value="false">Thất bại</option>
        </select>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" title="Từ ngày" />
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" title="Đến ngày" />
        {total > 0 && <span className="ml-auto self-center text-xs text-slate-400">{total.toLocaleString('vi-VN')} bản ghi</span>}
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
      {!loading && logs.length === 0 && <p className="text-sm text-slate-500">Không có nhật ký nào.</p>}
      {!loading && logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-center w-8" />
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Người thực hiện</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Module</th>
                <th className="px-4 py-3 text-left">Hành động</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Mô tả</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-center">
                    {log.success
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      : <AlertCircle className="h-4 w-4 text-red-500 inline" />}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{log.userName || '—'}</p>
                    <p className="text-xs text-slate-400">{log.userEmail || '—'}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{MODULES[log.module] || log.module}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{log.action}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500 max-w-xs truncate" title={log.description || ''}>{log.description || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(log)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => load(page - 1)} disabled={page <= 1} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= totalPages} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {/* Detail Modal */}
      {detailLog && (
        <Modal title="Chi tiết nhật ký" onClose={() => setDetailLog(null)} busy={detailLoading}>
          {detailLoading && <p className="text-sm text-slate-500">Đang tải...</p>}
          {!detailLoading && (
            <dl className="space-y-2.5 text-sm">
              {([
                ['Thời gian', fmtDate(detailLog.createdAt)],
                ['Người thực hiện', detailLog.userName || '—'],
                ['Email', detailLog.userEmail || '—'],
                ['Module', MODULES[detailLog.module] || detailLog.module],
                ['Hành động', detailLog.action],
                ['Đối tượng', detailLog.targetLabel || detailLog.targetId || '—'],
                ['Mô tả', detailLog.description || '—'],
                ['IP', detailLog.ipAddress || '—'],
                ['Kết quả', detailLog.success ? 'Thành công' : 'Thất bại'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-36 shrink-0 font-medium text-slate-500">{label}</dt>
                  <dd className="min-w-0 text-slate-800 break-all">{value}</dd>
                </div>
              ))}
              {detailLog.before != null && (
                <div>
                  <dt className="mb-1 font-medium text-slate-500">Trước</dt>
                  <dd><pre className="overflow-auto rounded-lg bg-slate-50 p-2 text-xs">{String(JSON.stringify(detailLog.before, null, 2))}</pre></dd>
                </div>
              )}
              {detailLog.after != null && (
                <div>
                  <dt className="mb-1 font-medium text-slate-500">Sau</dt>
                  <dd><pre className="overflow-auto rounded-lg bg-slate-50 p-2 text-xs">{String(JSON.stringify(detailLog.after, null, 2))}</pre></dd>
                </div>
              )}
            </dl>
          )}
        </Modal>
      )}
    </section>
    </AdminGuard>
  );
}
