'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Loader2, Search, ChevronLeft, ChevronRight, X,
  PackagePlus, SlidersHorizontal, History, ArrowUp, ArrowDown, ArrowRight,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice as fmt } from '@/lib/product';
import {
  adminGetInventoryStats, adminListInventory, adminImportStock, adminAdjustStock,
  adminGetInventoryLogs,
  type InventoryProduct, type InventoryStats, type InventoryLog, type StockStatus,
} from '@/services/adminInventory.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: '', label: 'Tất cả' },
  { value: 'in', label: 'Còn hàng' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'out', label: 'Hết hàng' },
];

const SORT_OPTS = [
  { value: 'name', label: 'Tên A→Z' },
  { value: 'stock_asc', label: 'Tồn kho tăng' },
  { value: 'stock_desc', label: 'Tồn kho giảm' },
  { value: 'updated', label: 'Cập nhật gần nhất' },
];

const LOG_TYPE_LABEL: Record<string, string> = {
  IMPORT: 'Nhập hàng',
  ADJUSTMENT: 'Điều chỉnh',
  ORDER_DEDUCT: 'Xuất bán',
  RETURN_RESTORE: 'Hoàn kho',
};

const LOG_TYPE_COLOR: Record<string, string> = {
  IMPORT: 'bg-emerald-50 text-emerald-700',
  ADJUSTMENT: 'bg-blue-50 text-blue-700',
  ORDER_DEDUCT: 'bg-slate-100 text-slate-600',
  RETURN_RESTORE: 'bg-amber-50 text-amber-700',
};

function StockBadge({ status }: { status: StockStatus }) {
  const map: Record<StockStatus, string> = {
    in: 'bg-emerald-50 text-emerald-700',
    low: 'bg-amber-50 text-amber-700',
    out: 'bg-red-50 text-red-700',
  };
  const label: Record<StockStatus, string> = { in: 'Còn hàng', low: 'Sắp hết', out: 'Hết hàng' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>{label[status]}</span>;
}

// ── Import Modal ───────────────────────────────────────────────────────────────

function ImportModal({ product, token, onClose, onDone }: {
  product: InventoryProduct;
  token: string | null;
  onClose: () => void;
  onDone: (updated: InventoryProduct) => void;
}) {
  const [qty, setQty] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(qty);
    if (!q || q < 1) { setError('Số lượng phải lớn hơn 0.'); return; }
    setLoading(true); setError('');
    try {
      const res = await adminImportStock(token, product.id, { quantity: q, reference: reference || undefined, note: note || undefined });
      onDone(res.product as unknown as InventoryProduct);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi nhập hàng.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Nhập hàng</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-slate-800">{product.name}</p>
            <p className="text-slate-500">SKU: {product.sku} · Tồn kho hiện tại: <span className="font-medium text-slate-700">{product.stockQuantity}</span></p>
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng nhập <span className="text-red-500">*</span></label>
            <input
              type="number" min="1" max="100000" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="Nhập số lượng..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              required
            />
            {qty && parseInt(qty) > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Sau nhập: <span className="font-medium text-slate-700">{product.stockQuantity + parseInt(qty)}</span>
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mã phiếu nhập</label>
            <input
              type="text" value={reference} onChange={e => setReference(e.target.value)}
              placeholder="Ví dụ: PN2024-001..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Ghi chú thêm..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
            <button
              type="submit" disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận nhập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Adjust Modal ───────────────────────────────────────────────────────────────

function AdjustModal({ product, token, onClose, onDone }: {
  product: InventoryProduct;
  token: string | null;
  onClose: () => void;
  onDone: (updated: InventoryProduct) => void;
}) {
  const [mode, setMode] = useState<'set' | 'delta'>('set');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsedValue = value !== '' ? parseInt(value) : NaN;
  const after = !isNaN(parsedValue) ? (mode === 'set' ? parsedValue : product.stockQuantity + parsedValue) : null;
  const delta = after !== null ? after - product.stockQuantity : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isNaN(parsedValue)) { setError('Vui lòng nhập giá trị.'); return; }
    if (after !== null && after < 0) { setError('Tồn kho sau điều chỉnh không được âm.'); return; }
    if (!reason.trim()) { setError('Vui lòng nhập lý do.'); return; }
    setLoading(true); setError('');
    try {
      const res = await adminAdjustStock(token, product.id, { mode, value: parsedValue, reason });
      onDone(res.product as unknown as InventoryProduct);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi điều chỉnh.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Điều chỉnh tồn kho</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-slate-800">{product.name}</p>
            <p className="text-slate-500">SKU: {product.sku} · Tồn kho hiện tại: <span className="font-medium text-slate-700">{product.stockQuantity}</span></p>
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức</label>
            <div className="flex gap-2">
              {(['set', 'delta'] as const).map(m => (
                <button
                  key={m} type="button"
                  onClick={() => { setMode(m); setValue(''); }}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${mode === m ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {m === 'set' ? 'Đặt số lượng cụ thể' : 'Thêm / bớt (±)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {mode === 'set' ? 'Số lượng mới' : 'Thay đổi (âm để bớt)'}
              <span className="text-red-500"> *</span>
            </label>
            <input
              type="number" value={value} onChange={e => setValue(e.target.value)}
              placeholder={mode === 'set' ? 'Nhập số lượng...' : 'Ví dụ: +10 hoặc -5...'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              required
            />
          </div>
          {after !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">{product.stockQuantity}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span className={`font-semibold ${after < 0 ? 'text-red-600' : after === 0 ? 'text-amber-600' : 'text-slate-800'}`}>{after}</span>
              {delta !== null && delta !== 0 && (
                <span className={`ml-1 flex items-center gap-0.5 text-xs ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(delta)}
                </span>
              )}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lý do điều chỉnh <span className="text-red-500">*</span></label>
            <input
              type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ví dụ: Kiểm kê thực tế, hàng hỏng..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
            <button
              type="submit" disabled={loading || (after !== null && after < 0)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── History Modal ──────────────────────────────────────────────────────────────

function HistoryModal({ product, token, onClose }: { product: InventoryProduct; token: string | null; onClose: () => void }) {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetInventoryLogs(token, { productId: product.id, page, limit });
      setLogs(res.logs);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [token, product.id, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: '80vh' }}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-800">Lịch sử tồn kho</h2>
            <p className="text-xs text-slate-500">{product.name} · SKU: {product.sku}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
          ) : logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Chưa có lịch sử giao dịch.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Thời gian</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Loại</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Trước</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Thay đổi</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Sau</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LOG_TYPE_COLOR[log.type] || 'bg-slate-100 text-slate-600'}`}>
                        {LOG_TYPE_LABEL[log.type] || log.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{log.quantityBefore}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={log.quantityChange > 0 ? 'text-emerald-600' : log.quantityChange < 0 ? 'text-red-500' : 'text-slate-500'}>
                        {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-800">{log.quantityAfter}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[160px] truncate">
                      {log.reference && <span className="mr-1 text-slate-400">{log.reference}</span>}
                      {log.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">{total} giao dịch</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [importTarget, setImportTarget] = useState<InventoryProduct | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryProduct | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InventoryProduct | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [result, statsData] = await Promise.all([
        adminListInventory(token, { page, limit, status: statusFilter || undefined, search: search || undefined, sort }),
        adminGetInventoryStats(token),
      ]);
      setProducts(result.products);
      setTotal(result.total);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, statusFilter, search, sort]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  function updateProductInList(updated: InventoryProduct) {
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    setStats(prev => prev ? null : null); // trigger stats reload next time
    setMessage('Cập nhật tồn kho thành công.');
    setError('');
  }

  const totalPages = Math.ceil(total / limit);

  const statCards = stats ? [
    { label: 'Tổng sản phẩm', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50' },
    { label: 'Còn hàng', value: stats.inStock, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Sắp hết hàng', value: stats.lowStock, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Hết hàng', value: stats.outOfStock, color: 'text-red-600', bg: 'bg-red-50' },
  ] : [];

  return (
    <div>
      <AdminPageHeader title="Quản lý kho hàng" />
      <AdminFeedback message={message} error={error} />

      {/* Stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(card => (
            <div key={card.label} className={`rounded-xl ${card.bg} p-4`}>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${card.color}`}>{card.value.toLocaleString('vi-VN')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Tên sản phẩm, SKU..."
            aria-label="Tìm kiếm tồn kho"
            className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-7 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {searchInput && (
            <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex gap-1">
          {STATUS_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value as StockStatus | ''); setPage(1); }}
              className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${statusFilter === opt.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {opt.label}
              {opt.value === 'low' && stats && stats.lowStock > 0 && (
                <span className="ml-1 rounded-full bg-amber-200 px-1.5 text-amber-800">{stats.lowStock}</span>
              )}
              {opt.value === 'out' && stats && stats.outOfStock > 0 && (
                <span className="ml-1 rounded-full bg-red-200 px-1.5 text-red-700">{stats.outOfStock}</span>
              )}
            </button>
          ))}
        </div>

        <select
          value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-600 focus:border-primary-400 focus:outline-none"
        >
          {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
        ) : products.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">Không tìm thấy sản phẩm nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Sản phẩm</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Tồn kho</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Ngưỡng</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Giá bán</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {p.primaryImage ? (
                            <Image src={mediaUrl(p.primaryImage)} alt={p.name} fill className="object-cover" sizes="36px" />
                          ) : (
                            <div className="h-full w-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800 max-w-[240px]">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-semibold ${p.stockQuantity <= 0 ? 'text-red-600' : p.stockQuantity <= p.lowStockThreshold ? 'text-amber-600' : 'text-slate-800'}`}>
                        {p.stockQuantity.toLocaleString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{p.lowStockThreshold}</td>
                    <td className="px-4 py-3 text-center"><StockBadge status={p.stockStatus} /></td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(p.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setImportTarget(p)} title="Nhập hàng"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setAdjustTarget(p)} title="Điều chỉnh"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setHistoryTarget(p)} title="Lịch sử"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                        >
                          <History className="h-3.5 w-3.5" />
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
          <p className="text-sm text-slate-500">{total} sản phẩm</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-slate-600">Trang {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {importTarget && (
        <ImportModal
          product={importTarget} token={token}
          onClose={() => setImportTarget(null)}
          onDone={updated => { setImportTarget(null); updateProductInList(updated); load(); }}
        />
      )}
      {adjustTarget && (
        <AdjustModal
          product={adjustTarget} token={token}
          onClose={() => setAdjustTarget(null)}
          onDone={updated => { setAdjustTarget(null); updateProductInList(updated); load(); }}
        />
      )}
      {historyTarget && (
        <HistoryModal product={historyTarget} token={token} onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  );
}
