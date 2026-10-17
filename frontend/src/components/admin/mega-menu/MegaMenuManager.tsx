'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Trash2, Plus,
  ArrowUp, ArrowDown, Search, Check, LayoutTemplate, AlertCircle, Save,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/auth.store';
import { getAdminCategories, type Category } from '@/services/category.service';
import { getAdminBrands, type Brand } from '@/services/brand.service';
import {
  getAdminMenu, getMenuOptions, saveMenu, saveGroup, deleteGroup,
  saveItem, deleteItem, invalidateMenuCache,
  type AdminMenu, type MenuGroup, type MenuItem, type MenuItemInput,
  type GroupInput, type ItemType, type AttributeOption,
} from '@/services/megaMenu.service';
import { useConfirm } from '@/components/ui/ConfirmDialog';

// ── Shared styles ────────────────────────────────────────────────────────────

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

const TYPE_LABELS: Record<ItemType, string> = {
  CATEGORY: 'Danh mục',
  BRAND: 'Thương hiệu',
  PRICE_FILTER: 'Khoảng giá',
  ATTRIBUTE_FILTER: 'Thuộc tính',
  CUSTOM_URL: 'URL tùy chỉnh',
};

const emptyGroup: GroupInput = { title: '', sortOrder: 0, columnSpan: 1, isActive: true };
const emptyItem: MenuItemInput = { label: '', type: 'CATEGORY', sortOrder: 0, isActive: true };

// ── IconBtn ──────────────────────────────────────────────────────────────────

function IconBtn({ title, onClick, disabled, children, variant, size = 'md' }: {
  title: string; onClick: () => void; disabled?: boolean;
  children: React.ReactNode; variant?: 'danger'; size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  return (
    <button
      type="button" title={title} onClick={onClick} disabled={disabled}
      className={`flex ${dim} items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition disabled:opacity-40 ${variant === 'danger' ? 'hover:border-red-200 hover:bg-red-50 hover:text-red-600' : 'hover:border-slate-300 hover:text-slate-700'}`}
    >
      {children}
    </button>
  );
}

// ── BrandMultiSelect ─────────────────────────────────────────────────────────

function BrandMultiSelect({ brands, selected, onChange, disabled }: {
  brands: Brand[]; selected: number[];
  onChange: (ids: number[]) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const btnLabel = selected.length === 0
    ? 'Chọn thương hiệu...'
    : `${selected.length} thương hiệu đã chọn`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button" disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate text-slate-700">{btnLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm thương hiệu..." className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-3 py-2 text-sm text-slate-400">Không tìm thấy.</p>
              : filtered.map(b => (
                <button key={b.id} type="button" onClick={() => toggle(b.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.includes(b.id) ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`}>
                    {selected.includes(b.id) && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className={selected.includes(b.id) ? 'font-medium text-slate-800' : 'text-slate-700'}>{b.name}</span>
                  {!b.isActive && <span className="ml-auto text-xs text-slate-400">Đang ẩn</span>}
                </button>
              ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-slate-100 p-2">
              <button type="button" onClick={() => onChange([])}
                className="text-xs text-slate-500 hover:text-red-600"
              >
                Bỏ chọn tất cả ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PreviewModal ─────────────────────────────────────────────────────────────

function PreviewModal({ menu, allBrands, brandIds, enabled, onClose }: {
  menu: AdminMenu; allBrands: Brand[]; brandIds: number[]; enabled: boolean; onClose: () => void;
}) {
  const selectedBrands = allBrands.filter(b => brandIds.includes(b.id));
  const groups = [...menu.groups].filter(g => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Modal title="Xem trước Mega Menu" onClose={onClose} size="lg" scrollableBody>
      {!enabled && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Mega Menu đang tắt — sẽ không hiển thị cho khách hàng.
        </div>
      )}
      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Chưa có nhóm nào được kích hoạt.</p>
      ) : (
        <div className="flex flex-wrap gap-6 rounded-xl border border-slate-100 bg-slate-50 p-5">
          {groups.map(group => (
            <div key={group.id} className="min-w-[120px]" style={{ flex: group.columnSpan }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>
              <ul className="space-y-1">
                {[...group.items]
                  .filter(i => i.isActive)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(item => (
                    <li key={item.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-primary-400" />
                      {item.label}
                      {item.invalid && <span className="text-xs text-red-500">⚠</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {selectedBrands.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thương hiệu nổi bật</p>
          <div className="flex flex-wrap gap-2">
            {selectedBrands.map(b => (
              <span key={b.id} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700">{b.name}</span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── GroupCard ────────────────────────────────────────────────────────────────

type GroupCardProps = {
  group: MenuGroup; isFirst: boolean; isLast: boolean; busy: boolean;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  onToggleItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
  onMoveItem: (item: MenuItem, dir: -1 | 1) => void;
};

function GroupCard({
  group, isFirst, isLast, busy,
  onEdit, onToggle, onDelete, onMoveUp, onMoveDown,
  onAddItem, onEditItem, onToggleItem, onDeleteItem, onMoveItem,
}: GroupCardProps) {
  const [expanded, setExpanded] = useState(true);
  const sortedItems = [...group.items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <article className="rounded-xl border border-slate-200 bg-white">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          aria-expanded={expanded}
        >
          {expanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <span className="font-medium text-slate-800">{group.title}</span>
          <span className="ml-2 text-xs text-slate-400">
            #{group.sortOrder} · {group.columnSpan} cột · {group.items.length} mục
          </span>
          {!group.isActive && (
            <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Ẩn</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconBtn title="Di chuyển lên" onClick={onMoveUp} disabled={busy || isFirst}>
            <ArrowUp className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Di chuyển xuống" onClick={onMoveDown} disabled={busy || isLast}>
            <ArrowDown className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title={group.isActive ? 'Ẩn nhóm' : 'Hiện nhóm'} onClick={onToggle} disabled={busy}>
            {group.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn title="Sửa nhóm" onClick={onEdit} disabled={busy}>
            <Pencil className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Xóa nhóm" onClick={onDelete} disabled={busy} variant="danger">
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      {/* ── Items ── */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          {sortedItems.length === 0 ? (
            <p className="py-1 text-sm text-slate-400">Chưa có mục nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sortedItems.map((item, idx) => (
                <li key={item.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm ${item.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {item.label}
                    </span>
                    <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      {TYPE_LABELS[item.type]}
                    </span>
                    {item.invalid && (
                      <span className="ml-1 text-xs text-red-500">· Tham chiếu không hợp lệ</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconBtn title="Di chuyển lên" size="sm" onClick={() => onMoveItem(item, -1)} disabled={busy || idx === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </IconBtn>
                    <IconBtn title="Di chuyển xuống" size="sm" onClick={() => onMoveItem(item, 1)} disabled={busy || idx === sortedItems.length - 1}>
                      <ArrowDown className="h-3 w-3" />
                    </IconBtn>
                    <IconBtn title={item.isActive ? 'Ẩn mục' : 'Hiện mục'} size="sm" onClick={() => onToggleItem(item)} disabled={busy}>
                      {item.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </IconBtn>
                    <IconBtn title="Sửa mục" size="sm" onClick={() => onEditItem(item)} disabled={busy}>
                      <Pencil className="h-3 w-3" />
                    </IconBtn>
                    <IconBtn title="Xóa mục" size="sm" onClick={() => onDeleteItem(item)} disabled={busy} variant="danger">
                      <Trash2 className="h-3 w-3" />
                    </IconBtn>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button" onClick={onAddItem} disabled={busy}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />Thêm mục
          </button>
        </div>
      )}
    </article>
  );
}

// ── MegaMenuManager ──────────────────────────────────────────────────────────

export default function MegaMenuManager() {
  const token = useAuthStore(s => s.token);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [categoryId, setCategoryId] = useState(0);
  const [menu, setMenu] = useState<AdminMenu | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [brandIds, setBrandIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const toast = useToast();
  const [groupEditor, setGroupEditor] = useState<{ id: number | null; data: GroupInput } | null>(null);
  const [itemEditor, setItemEditor] = useState<{ groupId: number; id: number | null; data: MenuItemInput } | null>(null);
  const confirm = useConfirm();

  // Track the last-loaded config to detect unsaved changes
  const loadedConfig = useRef({ enabled: true, brandIds: [] as number[] });
  const configDirty =
    enabled !== loadedConfig.current.enabled ||
    [...brandIds].sort().join(',') !== [...loadedConfig.current.brandIds].sort().join(',');

  // ── Load categories/brands/options once ──────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getAdminCategories(token, controller.signal),
      getAdminBrands(token, controller.signal),
      getMenuOptions(token, controller.signal),
    ])
      .then(([c, b, a]) => {
        setCategories(c.categories);
        setBrands(b.brands);
        setAttributes(a.attributes);
        const firstRoot = c.categories.find(cat => cat.parentId === null);
        if (firstRoot) setCategoryId(firstRoot.id);
      })
      .catch(e => { if (!controller.signal.aborted) toast.error(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); });
    return () => controller.abort();
  }, [token]);

  // ── Load menu for selected category ─────────────────────────────────────
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const result = await getAdminMenu(token, categoryId, signal);
      if (signal?.aborted) return;
      const e = result.menu?.isActive ?? true;
      const ids = result.menu?.brands.map(b => b.brandId) || [];
      setMenu(result.menu);
      setEnabled(e);
      setBrandIds(ids);
      loadedConfig.current = { enabled: e, brandIds: ids };
    } catch (e) {
      if (!signal?.aborted) toast.error(e instanceof Error ? e.message : 'Không tải được menu.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token, categoryId]);

  useEffect(() => {
    const controller = new AbortController();
    setMenu(null);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // ── Generic perform helper ───────────────────────────────────────────────
  const perform = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      invalidateMenuCache();
      toast.success('Đã lưu thay đổi.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được thay đổi.');
    } finally {
      setBusy(false);
    }
  };

  // ── Group helpers ────────────────────────────────────────────────────────
  const editGroup = (group?: MenuGroup) =>
    setGroupEditor({
      id: group?.id ?? null,
      data: group
        ? { title: group.title, sortOrder: group.sortOrder, columnSpan: group.columnSpan, isActive: group.isActive }
        : { ...emptyGroup, sortOrder: (menu?.groups ?? []).reduce((m, g) => Math.max(m, g.sortOrder), -1) + 1 },
    });

  const moveGroup = (group: MenuGroup, dir: -1 | 1) => {
    const sorted = [...(menu?.groups || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(g => g.id === group.id);
    const target = sorted[idx + dir];
    if (!target) return;
    void perform(async () => {
      await saveGroup(token, categoryId, group.id, { ...group, sortOrder: target.sortOrder });
      await saveGroup(token, categoryId, target.id, { ...target, sortOrder: group.sortOrder });
    });
  };

  // ── Item helpers ─────────────────────────────────────────────────────────
  const editItem = (group: MenuGroup, item?: MenuItem) =>
    setItemEditor({
      groupId: group.id,
      id: item?.id ?? null,
      data: item ? { ...item } : { ...emptyItem, sortOrder: group.items.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1 },
    });

  const moveItem = (group: MenuGroup, item: MenuItem, dir: -1 | 1) => {
    const sorted = [...group.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(i => i.id === item.id);
    const target = sorted[idx + dir];
    if (!target) return;
    void perform(async () => {
      await saveItem(token, group.id, item.id, { ...item, sortOrder: target.sortOrder });
      await saveItem(token, group.id, target.id, { ...target, sortOrder: item.sortOrder });
    });
  };

  const patchGroup = (patch: Partial<GroupInput>) =>
    setGroupEditor(e => e ? { ...e, data: { ...e.data, ...patch } } : e);
  const patchItem = (patch: Partial<MenuItemInput>) =>
    setItemEditor(e => e ? { ...e, data: { ...e.data, ...patch } } : e);

  const sortedGroups = [...(menu?.groups || [])].sort((a, b) => a.sortOrder - b.sortOrder);


  return (
    <section>
      <AdminPageHeader
        title="Mega Menu"
      />

      {/* ── Toolbar ── */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Category select */}
          <div className="min-w-[200px] flex-[2]">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Danh mục cấp chính</label>
            <select
              aria-label="Danh mục cấp chính"
              className={inputClass}
              value={categoryId}
              disabled={busy}
              onChange={e => { setCategoryId(Number(e.target.value)); }}
            >
              <option value={0}>Chọn danh mục</option>
              {categories.filter(c => c.parentId === null).map(c => (
                <option key={c.id} value={c.id}>{c.name}{!c.isActive ? ' (đang ẩn)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Brands */}
          {categoryId > 0 && (
            <div className="min-w-[200px] flex-[2]">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Thương hiệu nổi bật</label>
              <BrandMultiSelect brands={brands} selected={brandIds} onChange={setBrandIds} disabled={busy} />
            </div>
          )}

          {/* Enable toggle + actions */}
          {categoryId > 0 && !loading && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-slate-300">
                <input
                  type="checkbox" checked={enabled} disabled={busy}
                  onChange={e => setEnabled(e.target.checked)}
                  className="h-4 w-4 accent-primary-600"
                />
                <span className="font-medium text-slate-700">Bật Mega Menu</span>
              </label>

              {menu && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <LayoutTemplate className="h-4 w-4 text-slate-400" />Xem trước
                </button>
              )}

              <button
                type="button"
                disabled={busy || !configDirty}
                onClick={() => void perform(() => saveMenu(token!, categoryId, enabled, brandIds))}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                {configDirty ? 'Lưu cấu hình' : 'Đã lưu'}
              </button>
            </div>
          )}
        </div>

        {!categories.some(c => c.parentId === null) && (
          <p className="mt-3 text-sm text-slate-500">Tạo danh mục cấp chính trong module Danh mục trước.</p>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          Đang tải cấu hình...
        </div>
      )}

      {/* ── Groups ── */}
      {!loading && menu && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Nhóm hiển thị
              <span className="ml-2 text-sm font-normal text-slate-400">({menu.groups.length} nhóm)</span>
            </h2>
            <button
              type="button" disabled={busy}
              onClick={() => editGroup()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:text-primary-700 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />Thêm nhóm
            </button>
          </div>

          {menu.groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
              <p className="text-sm text-slate-500">Chưa có nhóm nào. Thêm nhóm và chọn liên kết tới danh mục, thương hiệu hoặc bộ lọc.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedGroups.map((group, idx) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isFirst={idx === 0}
                  isLast={idx === sortedGroups.length - 1}
                  busy={busy}
                  onEdit={() => editGroup(group)}
                  onToggle={() => void perform(() => saveGroup(token!, categoryId, group.id, {
                    title: group.title, columnSpan: group.columnSpan,
                    sortOrder: group.sortOrder, isActive: !group.isActive,
                  }))}
                  onDelete={async () => {
                    const ok = await confirm({
                      title: `Xóa nhóm "${group.title}" và tất cả mục bên trong?`,
                      confirmLabel: 'Xóa nhóm', destructive: true,
                    });
                    if (ok) void perform(() => deleteGroup(token!, group.id));
                  }}
                  onMoveUp={() => moveGroup(group, -1)}
                  onMoveDown={() => moveGroup(group, 1)}
                  onAddItem={() => editItem(group)}
                  onEditItem={item => editItem(group, item)}
                  onToggleItem={item => void perform(() => saveItem(token!, group.id, item.id, { ...item, isActive: !item.isActive }))}
                  onDeleteItem={async item => {
                    const ok = await confirm({ title: `Xóa mục "${item.label}"?`, confirmLabel: 'Xóa mục', destructive: true });
                    if (ok) void perform(() => deleteItem(token!, item.id));
                  }}
                  onMoveItem={(item, dir) => moveItem(group, item, dir)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Preview modal ── */}
      {previewOpen && menu && (
        <PreviewModal
          menu={menu}
          allBrands={brands}
          brandIds={brandIds}
          enabled={enabled}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* ── Group editor modal ── */}
      {groupEditor && (
        <Modal
          title={groupEditor.id ? 'Sửa nhóm' : 'Thêm nhóm'}
          busy={busy}
          onClose={() => setGroupEditor(null)}
        >
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              void perform(async () => {
                await saveGroup(token!, categoryId, groupEditor.id, groupEditor.data);
                setGroupEditor(null);
              });
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tên nhóm</span>
              <input autoFocus required maxLength={191} className={inputClass}
                value={groupEditor.data.title} onChange={e => patchGroup({ title: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Thứ tự</span>
                <input required type="number" min={0} max={2147483647} className={inputClass}
                  value={groupEditor.data.sortOrder} onChange={e => patchGroup({ sortOrder: Number(e.target.value) })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Column span</span>
                <input required type="number" min={1} max={4} className={inputClass}
                  value={groupEditor.data.columnSpan} onChange={e => patchGroup({ columnSpan: Number(e.target.value) })} />
              </label>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={groupEditor.data.isActive}
                onChange={e => patchGroup({ isActive: e.target.checked })} className="h-4 w-4 accent-primary-600" />
              <span className="font-medium text-slate-700">Hiển thị nhóm</span>
            </label>
            <button
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
            >
              <Save className="h-4 w-4" />Lưu nhóm
            </button>
          </form>
        </Modal>
      )}

      {/* ── Item editor modal ── */}
      {itemEditor && (
        <Modal
          title={itemEditor.id ? 'Sửa mục' : 'Thêm mục'}
          busy={busy}
          onClose={() => setItemEditor(null)}
        >
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              void perform(async () => {
                await saveItem(token!, itemEditor.groupId, itemEditor.id, itemEditor.data);
                setItemEditor(null);
              });
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tên hiển thị</span>
              <input autoFocus required maxLength={191} className={inputClass}
                value={itemEditor.data.label} onChange={e => patchItem({ label: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Loại liên kết</span>
              <select className={inputClass} value={itemEditor.data.type}
                onChange={e => patchItem({
                  type: e.target.value as ItemType,
                  categoryId: null, brandId: null, attributeId: null,
                  attributeValueId: null, attributeName: null, attributeValue: null,
                  minPrice: null, maxPrice: null, customUrl: null,
                })}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {itemEditor.data.type === 'CATEGORY' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Danh mục liên kết</span>
                <select required className={inputClass}
                  value={itemEditor.data.categoryId || ''}
                  onChange={e => patchItem({ categoryId: Number(e.target.value) })}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{!c.isActive ? ' (đang ẩn)' : ''}</option>
                  ))}
                </select>
              </label>
            )}

            {itemEditor.data.type === 'BRAND' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Thương hiệu liên kết</span>
                <select required className={inputClass}
                  value={itemEditor.data.brandId || ''}
                  onChange={e => patchItem({ brandId: Number(e.target.value) })}
                >
                  <option value="">Chọn thương hiệu</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}{!b.isActive ? ' (đang ẩn)' : ''}</option>
                  ))}
                </select>
              </label>
            )}

            {itemEditor.data.type === 'PRICE_FILTER' && (
              <div className="grid grid-cols-2 gap-3">
                {(['minPrice', 'maxPrice'] as const).map(field => (
                  <label key={field} className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {field === 'minPrice' ? 'Giá tối thiểu' : 'Giá tối đa'}
                    </span>
                    <input type="number" min={0} max={2147483647} className={inputClass}
                      value={itemEditor.data[field] ?? ''}
                      onChange={e => patchItem({ [field]: e.target.value === '' ? null : Number(e.target.value) })} />
                  </label>
                ))}
              </div>
            )}

            {itemEditor.data.type === 'ATTRIBUTE_FILTER' && (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Thuộc tính</span>
                  <select required className={inputClass}
                    value={itemEditor.data.attributeId || ''}
                    onChange={e => patchItem({ attributeId: Number(e.target.value) || null, attributeValueId: null })}
                  >
                    <option value="">Chọn thuộc tính</option>
                    {attributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Giá trị thuộc tính</span>
                  <select required className={inputClass}
                    value={itemEditor.data.attributeValueId || ''}
                    onChange={e => patchItem({ attributeValueId: Number(e.target.value) || null })}
                  >
                    <option value="">Chọn giá trị</option>
                    {attributes.find(a => a.id === itemEditor.data.attributeId)?.values.map(v => (
                      <option key={v.id} value={v.id}>{v.value}</option>
                    ))}
                  </select>
                </label>
                {!attributes.length && (
                  <p className="text-sm text-slate-500">Hãy tạo và bật giá trị thuộc tính trong module Thuộc tính trước.</p>
                )}
              </>
            )}

            {itemEditor.data.type === 'CUSTOM_URL' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">URL</span>
                <input required maxLength={1000} placeholder="/customer/products hoặc https://..." className={inputClass}
                  value={itemEditor.data.customUrl || ''} onChange={e => patchItem({ customUrl: e.target.value })} />
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Thứ tự mục</span>
                <input required type="number" min={0} max={2147483647} className={inputClass}
                  value={itemEditor.data.sortOrder} onChange={e => patchItem({ sortOrder: Number(e.target.value) })} />
              </label>
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={itemEditor.data.isActive}
                  onChange={e => patchItem({ isActive: e.target.checked })} className="h-4 w-4 accent-primary-600" />
                <span className="font-medium text-slate-700">Hiển thị mục</span>
              </label>
            </div>

            <button
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
            >
              <Save className="h-4 w-4" />Lưu mục
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
