'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Loader2, Search, ChevronLeft, ChevronRight, X, Plus, Pencil, Trash2,
  ToggleLeft, ToggleRight, Gift, Info, AlertCircle, RotateCcw,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatProductPrice as fmt } from '@/lib/product';
import { mediaUrl } from '@/services/http.client';
import {
  adminGetPromotionStats, adminListPromotions, adminGetPromotion, adminCreatePromotion,
  adminUpdatePromotion, adminTogglePromotion, adminDeletePromotion,
  adminListPromotionCategories, adminSearchPromotionProducts,
} from '@/services/adminPromotion.service';
import type {
  Promotion, PromotionDetail, PromotionStats, PromotionInput, PromotionStatus,
  PromotionType, PromotionScope, PromotionCategoryOption, PromotionProductOption,
} from '@/types/promotion.type';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTS: { value: PromotionStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'upcoming', label: 'Sắp diễn ra' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'disabled', label: 'Đã tắt' },
];

const STATUS_COLOR: Record<PromotionStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  upcoming: 'bg-blue-50 text-blue-700',
  expired: 'bg-slate-100 text-slate-500',
  disabled: 'bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<PromotionStatus, string> = {
  active: 'Đang hoạt động',
  upcoming: 'Sắp diễn ra',
  expired: 'Hết hạn',
  disabled: 'Đã tắt',
};

const TYPE_LABEL: Record<PromotionType, string> = { GIFT: 'Quà tặng', INFO: 'Ưu đãi thông tin' };
const SCOPE_LABEL: Record<PromotionScope, string> = { ALL: 'Tất cả sản phẩm', CATEGORY: 'Theo danh mục', PRODUCT: 'Theo sản phẩm' };

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateInput(s: string | null | undefined) {
  if (!s) return '';
  return new Date(s).toISOString().slice(0, 16);
}

// ── Category tree helpers (flat list with parentId → indented checkbox list) ──

function buildCategoryTree(flat: PromotionCategoryOption[]) {
  const byParent = new Map<number | null, PromotionCategoryOption[]>();
  for (const cat of flat) {
    const key = cat.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(cat);
  }
  const ordered: { cat: PromotionCategoryOption; depth: number }[] = [];
  function walk(parentId: number | null, depth: number) {
    for (const cat of byParent.get(parentId) || []) {
      ordered.push({ cat, depth });
      walk(cat.id, depth + 1);
    }
  }
  walk(null, 0);
  return ordered;
}

// ── Product search picker (inline, reused for gift product + applicable products) ──

function ProductSearchPicker({ token, selectedIds, onToggle, single = false }: {
  token: string | null;
  selectedIds: number[];
  onToggle: (id: number, product: PromotionProductOption) => void;
  single?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<PromotionProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminSearchPromotionProducts(token, search).then(res => { if (!cancelled) setProducts(res.products); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, token]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên sản phẩm..."
          className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
        {loading ? <p className="p-3 text-sm text-slate-500">Đang tải...</p> : products.length ? products.map(p => {
          const checked = selectedIds.includes(p.id);
          const thumb = p.images?.[0]?.imageUrl;
          return (
            <label key={p.id} className={`flex items-center gap-2.5 border-b border-slate-100 px-3 py-2 last:border-0 ${checked ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
              <input type={single ? 'radio' : 'checkbox'} checked={checked} onChange={() => onToggle(p.id, p)} className="h-4 w-4 shrink-0" />
              {thumb ? <img src={mediaUrl(thumb)} alt="" className="h-8 w-8 shrink-0 rounded-md border border-slate-100 object-contain" /> : <span className="h-8 w-8 shrink-0 rounded-md bg-slate-100" />}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.name}</span>
              <span className="shrink-0 text-xs font-medium text-slate-500">{fmt(p.price)}</span>
            </label>
          );
        }) : <p className="p-3 text-sm text-slate-500">Không tìm thấy sản phẩm.</p>}
      </div>
    </div>
  );
}

// ── Form Modal ──────────────────────────────────────────────────────────────

type FormState = {
  name: string; displayTitle: string; description: string; conditionText: string; detailUrl: string;
  type: PromotionType; scope: PromotionScope; sortOrder: number; isActive: boolean;
  startAt: string; endAt: string;
  giftMode: 'catalog' | 'manual';
  giftProductId: number | null; giftProductName: string; giftQuantity: string;
  categoryIds: number[]; productIds: number[];
};

const EMPTY_FORM: FormState = {
  name: '', displayTitle: '', description: '', conditionText: '', detailUrl: '',
  type: 'INFO', scope: 'ALL', sortOrder: 0, isActive: true,
  startAt: '', endAt: '',
  giftMode: 'catalog', giftProductId: null, giftProductName: '', giftQuantity: '',
  categoryIds: [], productIds: [],
};

function PromotionFormModal({ target, token, onClose, onSaved }: {
  target: PromotionDetail | 'new';
  token: string | null;
  onClose: () => void;
  onSaved: (p: PromotionDetail) => void;
}) {
  const isEdit = target !== 'new';
  const [form, setForm] = useState<FormState>(() => isEdit ? {
    name: target.name, displayTitle: target.displayTitle, description: target.description || '',
    conditionText: target.conditionText || '', detailUrl: target.detailUrl || '',
    type: target.type, scope: target.scope, sortOrder: target.sortOrder, isActive: target.isActive,
    startAt: fmtDateInput(target.startAt), endAt: fmtDateInput(target.endAt),
    giftMode: target.giftProductId ? 'catalog' : 'manual',
    giftProductId: target.giftProductId, giftProductName: target.giftProductName || '', giftQuantity: target.giftQuantity ? String(target.giftQuantity) : '',
    categoryIds: target.categoryIds, productIds: target.productIds,
  } : EMPTY_FORM);
  const [categories, setCategories] = useState<PromotionCategoryOption[]>([]);
  const [selectedGiftProduct, setSelectedGiftProduct] = useState<PromotionProductOption | null>(
    isEdit && target.giftProduct ? { id: target.giftProduct.id, name: target.giftProduct.name, price: target.giftProduct.price, images: [] } : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminListPromotionCategories(token).then(res => setCategories(res.categories)).catch(() => setCategories([]));
  }, [token]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleCategory(id: number) {
    setForm(prev => ({ ...prev, categoryIds: prev.categoryIds.includes(id) ? prev.categoryIds.filter(c => c !== id) : [...prev.categoryIds, id] }));
  }

  function toggleProduct(id: number) {
    setForm(prev => ({ ...prev, productIds: prev.productIds.includes(id) ? prev.productIds.filter(p => p !== id) : [...prev.productIds, id] }));
  }

  function pickGiftProduct(id: number, product: PromotionProductOption) {
    setSelectedGiftProduct(current => current?.id === id ? null : product);
    set('giftProductId', form.giftProductId === id ? null : id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      const payload: PromotionInput = {
        name: form.name.trim(), displayTitle: form.displayTitle.trim(),
        description: form.description.trim() || null, conditionText: form.conditionText.trim() || null,
        detailUrl: form.detailUrl.trim() || null,
        type: form.type, scope: form.scope, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive,
        startAt: form.startAt || null, endAt: form.endAt || null,
        giftProductId: form.type === 'GIFT' && form.giftMode === 'catalog' ? form.giftProductId : null,
        giftProductName: form.type === 'GIFT' && form.giftMode === 'manual' ? form.giftProductName.trim() || null : null,
        giftQuantity: form.type === 'GIFT' && form.giftQuantity ? Number(form.giftQuantity) : null,
        categoryIds: form.scope === 'CATEGORY' ? form.categoryIds : [],
        productIds: form.scope === 'PRODUCT' ? form.productIds : [],
      };
      const res = isEdit ? await adminUpdatePromotion(token, target.id, payload) : await adminCreatePromotion(token, payload);
      onSaved(res.promotion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu chương trình.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100';
  const labelCls = 'mb-1 block text-xs font-medium text-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: '92vh' }}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Chỉnh sửa chương trình' : 'Tạo chương trình khuyến mãi'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {/* Thông tin cơ bản */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Thông tin cơ bản</p>
            <div>
              <label className={labelCls}>Tên chương trình (nội bộ) *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Tặng chuột gaming Logitech" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Tiêu đề hiển thị trên trang sản phẩm *</label>
              <input value={form.displayTitle} onChange={e => set('displayTitle', e.target.value)} placeholder="VD: Tặng chuột gaming Logitech G102" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Mô tả</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
            </div>
            <div>
              <label className={labelCls}>Điều kiện áp dụng</label>
              <input value={form.conditionText} onChange={e => set('conditionText', e.target.value)} placeholder="VD: Áp dụng khi mua kèm bo mạch chủ" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Link xem chi tiết (tùy chọn)</label>
              <input value={form.detailUrl} onChange={e => set('detailUrl', e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
          </div>

          {/* Loại ưu đãi */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Loại ưu đãi</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => set('type', 'GIFT')} className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'GIFT' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Gift className="h-4 w-4" /> Quà tặng sản phẩm
              </button>
              <button type="button" onClick={() => set('type', 'INFO')} className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'INFO' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Info className="h-4 w-4" /> Ưu đãi mua hàng
              </button>
            </div>

            {form.type === 'GIFT' && (
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex gap-1 text-xs">
                  <button type="button" onClick={() => set('giftMode', 'catalog')} className={`rounded-md px-2.5 py-1 font-medium ${form.giftMode === 'catalog' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'}`}>Chọn từ sản phẩm cửa hàng</button>
                  <button type="button" onClick={() => set('giftMode', 'manual')} className={`rounded-md px-2.5 py-1 font-medium ${form.giftMode === 'manual' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'}`}>Nhập tên quà thủ công</button>
                </div>
                {form.giftMode === 'catalog' ? (
                  selectedGiftProduct ? (
                    <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2">
                      <span className="truncate text-sm font-medium text-primary-700">{selectedGiftProduct.name}</span>
                      <button type="button" onClick={() => { setSelectedGiftProduct(null); set('giftProductId', null); }} className="text-primary-600 hover:text-primary-800"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <ProductSearchPicker token={token} selectedIds={form.giftProductId ? [form.giftProductId] : []} onToggle={pickGiftProduct} single />
                  )
                ) : (
                  <input value={form.giftProductName} onChange={e => set('giftProductName', e.target.value)} placeholder="Tên quà tặng (VD: Chuột gaming Logitech G102)" className={inputCls} />
                )}
                <div className="mt-2">
                  <label className={labelCls}>Số lượng quà dự kiến</label>
                  <input type="number" min="1" value={form.giftQuantity} onChange={e => set('giftQuantity', e.target.value)} placeholder="Không giới hạn" className={`${inputCls} max-w-[160px]`} />
                </div>
              </div>
            )}
          </div>

          {/* Phạm vi áp dụng */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phạm vi áp dụng</p>
            <div className="grid grid-cols-3 gap-2">
              {(['ALL', 'CATEGORY', 'PRODUCT'] as PromotionScope[]).map(s => (
                <button key={s} type="button" onClick={() => set('scope', s)} className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${form.scope === s ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {SCOPE_LABEL[s]}
                </button>
              ))}
            </div>
            {form.scope === 'CATEGORY' && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {categoryTree.length ? categoryTree.map(({ cat, depth }) => (
                  <label key={cat.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
                    <input type="checkbox" checked={form.categoryIds.includes(cat.id)} onChange={() => toggleCategory(cat.id)} className="h-4 w-4" />
                    <span className="text-slate-700">{cat.name}</span>
                  </label>
                )) : <p className="p-2 text-sm text-slate-400">Đang tải danh mục...</p>}
                <p className="mt-1 px-2 text-xs text-slate-400">Chọn danh mục cha sẽ tự áp dụng cho các danh mục con bên trong.</p>
              </div>
            )}
            {form.scope === 'PRODUCT' && (
              <div>
                <ProductSearchPicker token={token} selectedIds={form.productIds} onToggle={toggleProduct} />
                <p className="mt-1.5 text-xs text-slate-500">Đã chọn {form.productIds.length} sản phẩm</p>
              </div>
            )}
          </div>

          {/* Thời gian & thứ tự */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Thời gian áp dụng</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ngày bắt đầu</label>
                <input type="datetime-local" value={form.startAt} onChange={e => set('startAt', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ngày kết thúc</label>
                <input type="datetime-local" value={form.endAt} onChange={e => set('endAt', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Thứ tự ưu tiên hiển thị</label>
                <input type="number" min="0" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} className={inputCls} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
                  Kích hoạt ngay
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo chương trình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tab ────────────────────────────────────────────────────────────────────────

export default function PromotionTab() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const toast = useToast();
  const confirm = useConfirm();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | ''>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [formTarget, setFormTarget] = useState<PromotionDetail | 'new' | null>(null);
  const [editLoading, setEditLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [result, statsData] = await Promise.all([
        adminListPromotions(token, { page, limit, search: search || undefined, status: statusFilter || undefined }),
        adminGetPromotionStats(token),
      ]);
      setPromotions(result.promotions);
      setTotal(result.total);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
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

  async function openEdit(p: Promotion) {
    setEditLoading(p.id);
    try {
      const res = await adminGetPromotion(token, p.id);
      setFormTarget(res.promotion);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể tải chi tiết chương trình.');
    } finally {
      setEditLoading(null);
    }
  }

  async function handleToggle(p: Promotion) {
    setActionLoading(p.id);
    try {
      const res = await adminTogglePromotion(token, p.id, !p.isActive);
      setPromotions(prev => prev.map(item => item.id === p.id ? res.promotion : item));
      toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thao tác thất bại.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(p: Promotion) {
    const ok = await confirm({ title: 'Xóa chương trình', description: `Xóa chương trình "${p.name}"? Hành động này không thể hoàn tác.`, destructive: true });
    if (!ok) return;
    setActionLoading(p.id);
    try {
      await adminDeletePromotion(token, p.id);
      toast.success('Đã xóa chương trình.');
      setPromotions(prev => prev.filter(item => item.id !== p.id));
      setTotal(t => t - 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleSaved(saved: PromotionDetail) {
    const isEdit = formTarget !== 'new';
    if (isEdit) {
      setPromotions(prev => prev.map(p => p.id === saved.id ? saved : p));
    } else {
      setPromotions(prev => [saved, ...prev]);
      setTotal(t => t + 1);
    }
    toast.success(isEdit ? 'Đã cập nhật chương trình.' : 'Đã tạo chương trình mới.');
    setFormTarget(null);
    adminGetPromotionStats(token).then(setStats).catch(() => {});
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <AdminPageHeader
        title="Khuyến mãi & Quà tặng"
        description="Quản lý chương trình ưu đãi và quà tặng hiển thị trên trang chi tiết sản phẩm"
        action={
          <button onClick={() => setFormTarget('new')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 text-sm font-medium text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />Tạo chương trình
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tổng chương trình', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50' },
            { label: 'Đang hoạt động', value: stats.active, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Sắp diễn ra', value: stats.upcoming, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Đã hết hạn', value: stats.expired, color: 'text-slate-500', bg: 'bg-slate-50' },
          ].map(card => (
            <div key={card.label} className={`rounded-xl ${card.bg} p-4`}>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Tên chương trình..." aria-label="Tìm kiếm chương trình"
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
            <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${statusFilter === opt.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table — desktop/tablet */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Thử lại</button>
          </div>
        ) : promotions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Chưa có chương trình khuyến mãi nào.</p>
            <button onClick={() => setFormTarget('new')} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <Plus className="h-4 w-4" />Tạo chương trình đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Tên chương trình</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Loại ưu đãi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Áp dụng cho</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Thời gian</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{p.displayTitle}</p>
                      <p className="text-xs text-slate-500">{p.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${p.type === 'GIFT' ? 'bg-orange-50 text-primary-700' : 'bg-blue-50 text-blue-700'}`}>
                        {p.type === 'GIFT' ? <Gift className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                        {TYPE_LABEL[p.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.scope === 'ALL' && 'Tất cả sản phẩm'}
                      {p.scope === 'CATEGORY' && `${p._count?.categories ?? 0} danh mục`}
                      {p.scope === 'PRODUCT' && `${p._count?.products ?? 0} sản phẩm`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(p.startAt)} → {fmtDate(p.endAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleToggle(p)} disabled={actionLoading === p.id} title={p.isActive ? 'Tắt' : 'Bật'}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                          {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.isActive ? <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => openEdit(p)} disabled={editLoading === p.id} title="Xem / Chỉnh sửa"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40">
                          {editLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(p)} disabled={actionLoading === p.id} title="Xóa"
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

      {/* Card list — mobile */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
        ) : error ? (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Thử lại</button>
          </div>
        ) : promotions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
            <p className="text-sm text-slate-400">Chưa có chương trình khuyến mãi nào.</p>
            <button onClick={() => setFormTarget('new')} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <Plus className="h-4 w-4" />Tạo chương trình đầu tiên
            </button>
          </div>
        ) : promotions.map(p => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{p.displayTitle}</p>
                <p className="truncate text-xs text-slate-500">{p.name}</p>
              </div>
              <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${p.type === 'GIFT' ? 'bg-orange-50 text-primary-700' : 'bg-blue-50 text-blue-700'}`}>
                {p.type === 'GIFT' ? <Gift className="h-3 w-3" /> : <Info className="h-3 w-3" />}{TYPE_LABEL[p.type]}
              </span>
              <span>{SCOPE_LABEL[p.scope]}</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">{fmtDate(p.startAt)} → {fmtDate(p.endAt)}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => handleToggle(p)} disabled={actionLoading === p.id}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
                {p.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}{p.isActive ? 'Tắt' : 'Bật'}
              </button>
              <button onClick={() => openEdit(p)} disabled={editLoading === p.id}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
                <Pencil className="h-3.5 w-3.5" />Sửa
              </button>
              <button onClick={() => handleDelete(p)} disabled={actionLoading === p.id}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} chương trình</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-sm text-slate-600">Trang {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {formTarget && (
        <PromotionFormModal target={formTarget} token={token} onClose={() => setFormTarget(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
