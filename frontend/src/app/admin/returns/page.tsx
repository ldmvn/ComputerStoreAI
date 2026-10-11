'use client';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, X, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { adminListReturns, adminUpdateReturnStatus, type AdminReturn } from '@/services/adminSales.service';
import { formatProductPrice } from '@/lib/product';

type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

const STATUS_LABEL: Record<ReturnStatus, string> = {
  PENDING:   'Chờ xử lý',
  APPROVED:  'Đã duyệt',
  REJECTED:  'Từ chối',
  COMPLETED: 'Hoàn thành',
};

const STATUS_COLOR: Record<ReturnStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  APPROVED:  'bg-blue-50 text-blue-700',
  REJECTED:  'bg-red-50 text-red-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
};

const NEXT_ACTIONS: Partial<Record<ReturnStatus, { status: ReturnStatus; label: string; variant: 'primary' | 'danger' }[]>> = {
  PENDING: [
    { status: 'APPROVED', label: 'Duyệt', variant: 'primary' },
    { status: 'REJECTED', label: 'Từ chối', variant: 'danger' },
  ],
  APPROVED: [
    { status: 'COMPLETED', label: 'Hoàn thành', variant: 'primary' },
  ],
};

export default function AdminReturnsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const result = await adminListReturns(token, {
        page, limit,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setReturns(result.returns);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally { setLoading(false); }
  }, [token, page, limit, statusFilter, search]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const clearSearch = () => { setSearchInput(''); setPage(1); setSearch(''); };

  const handleAction = async (ret: AdminReturn, status: ReturnStatus) => {
    if (!token) return;
    setActionLoading(ret.id);
    try {
      await adminUpdateReturnStatus(token, ret.id, { status, adminNote: noteMap[ret.id] });
      setMessage(`Yêu cầu #${ret.id} → ${STATUS_LABEL[status]}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật thất bại.');
    } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <section>
      <AdminPageHeader title="Đổi trả" />
      <AdminFeedback message={message} error={error} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm min-w-[180px]">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ID yêu cầu, ID đơn, tên khách..."
            aria-label="Tìm kiếm đổi trả"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {searchInput && <button onClick={clearSearch}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
          <button onClick={handleSearch} className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">Tìm</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([{ value: '', label: 'Tất cả' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]).map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${statusFilter === opt.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div>
        ) : returns.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-14 text-center shadow-sm">
            <Undo2 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">Không có yêu cầu đổi trả nào.</p>
          </div>
        ) : returns.map(ret => {
          const actions = NEXT_ACTIONS[ret.status as ReturnStatus] ?? [];
          return (
            <div key={ret.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">Yêu cầu #{ret.id}</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[ret.status as ReturnStatus]}`}>
                      {STATUS_LABEL[ret.status as ReturnStatus]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Đơn hàng #{ret.orderId} · {ret.user.fullName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{ret.user.email}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p className="font-semibold tabular-nums text-primary-700">{formatProductPrice(ret.order.subtotal)}</p>
                  <p className="text-xs text-slate-400">{new Date(ret.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Lý do:</p>
                <p className="mt-0.5 text-sm text-slate-700">{ret.reason}</p>
              </div>
              {ret.adminNote && (
                <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2">
                  <p className="text-xs font-medium text-blue-600">Ghi chú xử lý:</p>
                  <p className="mt-0.5 text-sm text-blue-800">{ret.adminNote}</p>
                </div>
              )}
              {actions.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <textarea
                    placeholder="Ghi chú xử lý (không bắt buộc)"
                    rows={2}
                    value={noteMap[ret.id] ?? ''}
                    onChange={e => setNoteMap(prev => ({ ...prev, [ret.id]: e.target.value }))}
                    className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                  <div className="flex gap-2">
                    {actions.map(action => (
                      <button
                        key={action.status}
                        disabled={actionLoading === ret.id}
                        onClick={() => handleAction(ret, action.status)}
                        className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                          action.variant === 'primary'
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'border border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {actionLoading === ret.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} yêu cầu</p>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-sm text-slate-600">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </section>
  );
}
