'use client';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, ChevronLeft, ChevronRight, X, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { formatProductPrice as fmt } from '@/lib/product';
import {
  adminGetVoucherStats, adminListVouchers, adminCreateVoucher, adminUpdateVoucher,
  adminToggleVoucher, adminDeleteVoucher,
  type Voucher, type VoucherStats, type VoucherInput, type VoucherStatus,
} from '@/services/adminVoucher.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTS: { value: VoucherStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'upcoming', label: 'Sắp diễn ra' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'disabled', label: 'Đã tắt' },
  { value: 'exhausted', label: 'Hết lượt' },
];

const STATUS_COLOR: Record<VoucherStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  upcoming: 'bg-blue-50 text-blue-700',
  expired: 'bg-slate-100 text-slate-500',
  disabled: 'bg-red-50 text-red-700',
  exhausted: 'bg-amber-50 text-amber-700',
};

const STATUS_LABEL: Record<VoucherStatus, string> = {
  active: 'Đang hoạt động',
  upcoming: 'Sắp diễn ra',
  expired: 'Hết hạn',
  disabled: 'Đã tắt',
  exhausted: 'Hết lượt',
};

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateInput(s: string | null | undefined) {
  if (!s) return '';
  return new Date(s).toISOString().slice(0, 16);
}

// ── Voucher Form Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM: VoucherInput = {
  code: '', name: '', type: 'PERCENT', value: 0,
  maxDiscount: null, minOrderAmount: 0,
  startAt: null, endAt: null, usageLimit: null, isActive: true,
};

function VoucherFormModal({ voucher, token, onClose, onSaved }: {
  voucher: Voucher | null;
  token: string;
  onClose: () => void;
  onSaved: (v: Voucher) => void;
}) {
  const isEdit = Boolean(voucher);
  const [form, setForm] = useState<VoucherInput>(voucher ? {
    code: voucher.code, name: voucher.name, type: voucher.type,
    value: voucher.value, maxDiscount: voucher.maxDiscount,
    minOrderAmount: voucher.minOrderAmount, startAt: fmtDateInput(voucher.startAt),
    endAt: fmtDateInput(voucher.endAt), usageLimit: voucher.usageLimit, isActive: voucher.isActive,
  } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof VoucherInput>(key: K, val: VoucherInput[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload: VoucherInput = {
        ...form,
        code: (form.code as string).toUpperCase().trim(),
        value: Number(form.value),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
      };
      let res;
      if (isEdit && voucher) {
        res = await adminUpdateVoucher(token, voucher.id, payload);
      } else {
        res = await adminCreateVoucher(token, payload);
      }
      onSaved(res.voucher);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi lưu voucher.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: '90vh' }}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Mã voucher *</label>
              <input type="text" value={form.code as string} onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="VD: SALE10" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tên chương trình *</label>
              <input type="text" value={form.name as string} onChange={e => set('name', e.target.value)}
                placeholder="Khuyến mãi hè 2024" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Loại giảm giá *</label>
              <select value={form.type} onChange={e => set('type', e.target.value as 'PERCENT' | 'FIXED')}
                className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-primary-400 focus:outline-none">
                <option value="PERCENT">Theo % (phần trăm)</option>
                <option value="FIXED">Số tiền cố định (₫)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                {form.type === 'PERCENT' ? 'Giá trị (%) *' : 'Số tiền giảm (₫) *'}
              </label>
              <input type="number" min="1" max={form.type === 'PERCENT' ? 100 : undefined}
                value={form.value as number || ''} onChange={e => set('value', Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" required />
            </div>
          </div>

          {form.type === 'PERCENT' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Giảm tối đa (₫)</label>
              <input type="number" min="0"
                value={form.maxDiscount ?? ''} onChange={e => set('maxDiscount', e.target.value ? Number(e.target.value) : null)}
                placeholder="Không giới hạn"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Đơn hàng tối thiểu (₫)</label>
            <input type="number" min="0"
              value={form.minOrderAmount as number || ''} onChange={e => set('minOrderAmount', Number(e.target.value))}
              placeholder="0"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Thời gian bắt đầu</label>
              <input type="datetime-local"
                value={form.startAt as string || ''} onChange={e => set('startAt', e.target.value || null)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Thời gian kết thúc</label>
              <input type="datetime-local"
                value={form.endAt as string || ''} onChange={e => set('endAt', e.target.value || null)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Giới hạn lượt sử dụng</label>
            <input type="number" min="1"
              value={form.usageLimit ?? ''} onChange={e => set('usageLimit', e.target.value ? Number(e.target.value) : null)}
              placeholder="Không giới hạn"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive as boolean}
              onChange={e => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600" />
            <label htmlFor="isActive" className="text-sm text-slate-700">Kích hoạt ngay sau khi tạo</label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminPromotionsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const toast = useToast();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | ''>('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [formTarget, setFormTarget] = useState<Voucher | 'new' | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        adminListVouchers(token, { page, limit, search: search || undefined, status: statusFilter || undefined }),
        adminGetVoucherStats(token),
      ]);
      setVouchers(result.vouchers);
      setTotal(result.total);
      setStats(statsData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handleToggle(v: Voucher) {
    if (!token) return;
    setActionLoading(v.id);
    try {
      const res = await adminToggleVoucher(token, v.id, !v.isActive);
      setVouchers(prev => prev.map(item => item.id === v.id ? res.voucher : item));
      toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thao tác thất bại.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(v: Voucher) {
    if (!token) return;
    if (!confirm(`Xóa voucher "${v.code}"? Hành động này không thể hoàn tác.`)) return;
    setActionLoading(v.id);
    try {
      await adminDeleteVoucher(token, v.id);
      toast.success('Đã xóa voucher.');
      setVouchers(prev => prev.filter(item => item.id !== v.id));
      setTotal(t => t - 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleSaved(saved: Voucher) {
    const isEdit = formTarget !== 'new';
    if (isEdit) {
      setVouchers(prev => prev.map(v => v.id === saved.id ? saved : v));
    } else {
      setVouchers(prev => [saved, ...prev]);
      setTotal(t => t + 1);
    }
    toast.success(isEdit ? 'Đã cập nhật voucher.' : 'Đã tạo voucher mới.');
    setFormTarget(null);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <AdminPageHeader
        title="Quản lý khuyến mãi"
        action={
          <button onClick={() => setFormTarget('new')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 text-sm font-medium text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />Tạo voucher
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {[
            { label: 'Tổng voucher', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50' },
            { label: 'Đang hoạt động', value: stats.active, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Lượt đã dùng', value: stats.totalUsage, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Tổng tiết kiệm', value: fmt(stats.totalDiscount), color: 'text-primary-700', bg: 'bg-orange-50' },
          ].map(card => (
            <div key={card.label} className={`rounded-xl ${card.bg} p-4`}>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${card.color}`}>
                {typeof card.value === 'number' ? card.value.toLocaleString('vi-VN') : card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Mã, tên chương trình..."
            aria-label="Tìm kiếm khuyến mãi"
            className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-7 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTS.map(opt => (
            <button key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${statusFilter === opt.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
        ) : vouchers.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Chưa có voucher nào.</p>
            <button onClick={() => setFormTarget('new')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <Plus className="h-4 w-4" />Tạo voucher đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Mã & Tên</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Giảm giá</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Điều kiện</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Thời gian</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Lượt dùng</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-semibold text-slate-800">{v.code}</p>
                      <p className="text-xs text-slate-500">{v.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-primary-700">
                        {v.type === 'PERCENT' ? `${v.value}%` : fmt(v.value)}
                      </p>
                      {v.type === 'PERCENT' && v.maxDiscount && (
                        <p className="text-xs text-slate-400">Tối đa {fmt(v.maxDiscount)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.minOrderAmount > 0
                        ? <p className="text-xs text-slate-500">Đơn từ {fmt(v.minOrderAmount)}</p>
                        : <p className="text-xs text-slate-400">Không giới hạn</p>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <p>{fmtDate(v.startAt)} → {fmtDate(v.endAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-sm">
                      <span className="font-medium text-slate-700">{v.usageCount}</span>
                      {v.usageLimit && <span className="text-slate-400"> / {v.usageLimit}</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[v.status]}`}>
                        {STATUS_LABEL[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleToggle(v)} disabled={actionLoading === v.id}
                          title={v.isActive ? 'Tắt voucher' : 'Bật voucher'}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                          {actionLoading === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : v.isActive ? <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setFormTarget(v)} title="Chỉnh sửa"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(v)} disabled={actionLoading === v.id}
                          title="Xóa voucher"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
          <p className="text-sm text-slate-500">{total} voucher</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-slate-600">Trang {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formTarget && token && (
        <VoucherFormModal
          voucher={formTarget === 'new' ? null : formTarget}
          token={token}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
