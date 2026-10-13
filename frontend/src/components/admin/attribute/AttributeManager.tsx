'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, Eye, EyeOff, Filter, FolderOpen,
  Layers, MoreHorizontal, Pencil, Plus, Tags, Trash2, Users, X,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/auth.store';
import { getAdminCategories, type Category } from '@/services/category.service';
import {
  getAttributes, createAttribute, updateAttribute, deleteAttribute,
  setAttributeStatus, setAttributeOrder, setAttributeCategoryLinks,
  createAttributeValue, updateAttributeValue, deleteAttributeValue, setAttributeValueStatus,
  getGroups, createGroup, updateGroup, deleteGroup, setGroupStatus, setGroupOrder, setGroupMembers,
  type Attribute, type AttributeInput, type AttributeType, type AttributeValue,
  type AttributeGroup, type AttributeGroupInput, type CategoryLinkInput,
} from '@/services/attribute.service';
import { adminActionButtonClass } from '@/components/admin/adminActionStyles';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPES: Record<AttributeType, string> = {
  SELECT: 'Chọn một', MULTI_SELECT: 'Chọn nhiều',
  TEXT: 'Văn bản', NUMBER: 'Số', BOOLEAN: 'Có/Không',
};

const TYPE_BADGE: Record<AttributeType, string> = {
  SELECT: 'bg-blue-50 text-blue-700',
  MULTI_SELECT: 'bg-violet-50 text-violet-700',
  TEXT: 'bg-slate-100 text-slate-600',
  NUMBER: 'bg-amber-50 text-amber-700',
  BOOLEAN: 'bg-emerald-50 text-emerald-700',
};

const inp = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300';
const lbl = 'block text-xs font-semibold text-slate-600';
const act = adminActionButtonClass;
const btnSave = 'w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50';
const CHIP_LIMIT = 3;

const slugify = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── Group form modal ──────────────────────────────────────────────────────────
type GF = AttributeGroupInput & { sortOrder: number; isActive: boolean };

function GroupFormModal({ group, busy, onSave, onClose }: {
  group?: AttributeGroup; busy: boolean;
  onSave: (d: AttributeGroupInput) => void; onClose: () => void;
}) {
  const [f, setF] = useState<GF>({
    name: group?.name ?? '', slug: group?.slug ?? '',
    description: group?.description ?? '', icon: group?.icon ?? '',
    sortOrder: group?.sortOrder ?? 0, isActive: group?.isActive ?? true,
  });
  const s = <K extends keyof GF>(k: K, v: GF[K]) => setF(x => ({ ...x, [k]: v }));
  return (
    <Modal title={group ? 'Sửa nhóm' : 'Thêm nhóm thuộc tính'} busy={busy} onClose={onClose}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSave(f); }}>
        <label className={lbl}>Tên nhóm <span className="text-red-500">*</span>
          <input autoFocus required maxLength={191} className={inp} value={f.name}
            onChange={e => { s('name', e.target.value); if (!group) s('slug', slugify(e.target.value)); }} />
        </label>
        <label className={lbl}>Slug
          <input required className={inp} value={f.slug} onChange={e => s('slug', e.target.value)} />
        </label>
        <label className={lbl}>Mô tả
          <textarea rows={2} maxLength={500} className={`${inp} resize-none`} value={f.description ?? ''}
            onChange={e => s('description', e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={lbl}>Icon (tên Lucide)
            <input maxLength={64} className={inp} value={f.icon ?? ''} placeholder="cpu"
              onChange={e => s('icon', e.target.value)} />
          </label>
          <label className={lbl}>Thứ tự
            <input type="number" min={0} className={inp} value={f.sortOrder}
              onChange={e => s('sortOrder', Number(e.target.value))} />
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={f.isActive} onChange={e => s('isActive', e.target.checked)} className="h-4 w-4 accent-primary-600" />
          <span className="text-slate-700">Đang hoạt động</span>
        </label>
        <button disabled={busy} type="submit" className={btnSave}>Lưu nhóm</button>
      </form>
    </Modal>
  );
}

// ── Attribute form modal ──────────────────────────────────────────────────────
type AF = Required<AttributeInput>;

const emptyAttr = (sortHint: number): AF => ({
  name: '', slug: '', type: 'SELECT', sortOrder: sortHint,
  isActive: true, unit: '', description: '',
  showInDetail: true, usedInFilter: false, usedInBuildPC: false,
});

function AttributeFormModal({ attr, sortHint, busy, onSave, onClose }: {
  attr?: Attribute; sortHint: number; busy: boolean;
  onSave: (d: AttributeInput) => void; onClose: () => void;
}) {
  const [f, setF] = useState<AF>(attr ? {
    name: attr.name, slug: attr.slug, type: attr.type, sortOrder: attr.sortOrder,
    isActive: attr.isActive, unit: attr.unit ?? '', description: attr.description ?? '',
    showInDetail: attr.showInDetail, usedInFilter: attr.usedInFilter, usedInBuildPC: attr.usedInBuildPC,
  } : emptyAttr(sortHint));
  const s = <K extends keyof AF>(k: K, v: AF[K]) => setF(x => ({ ...x, [k]: v }));
  return (
    <Modal title={attr ? 'Sửa thuộc tính' : 'Thêm thuộc tính'} busy={busy} onClose={onClose}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSave(f); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`${lbl} sm:col-span-2`}>Tên thuộc tính <span className="text-red-500">*</span>
            <input autoFocus required maxLength={191} className={inp} value={f.name}
              onChange={e => { s('name', e.target.value); if (!attr) s('slug', slugify(e.target.value)); }} />
          </label>
          <label className={lbl}>Slug
            <input required className={inp} value={f.slug} onChange={e => s('slug', e.target.value)} />
          </label>
          <label className={lbl}>Loại dữ liệu
            <select className={inp} value={f.type} onChange={e => s('type', e.target.value as AttributeType)}>
              {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className={lbl}>Đơn vị đo (GB, GHz…)
            <input maxLength={32} className={inp} value={f.unit} placeholder="Để trống nếu không có"
              onChange={e => s('unit', e.target.value)} />
          </label>
          <label className={lbl}>Thứ tự
            <input type="number" min={0} className={inp} value={f.sortOrder}
              onChange={e => s('sortOrder', Number(e.target.value))} />
          </label>
          <label className={`${lbl} sm:col-span-2`}>Mô tả nội bộ
            <textarea rows={2} maxLength={500} className={`${inp} resize-none`} value={f.description}
              onChange={e => s('description', e.target.value)} />
          </label>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Cấu hình</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['isActive', 'Hoạt động'],
              ['showInDetail', 'Hiện chi tiết SP'],
              ['usedInFilter', 'Dùng bộ lọc'],
              ['usedInBuildPC', 'Dùng Build PC'],
            ] as [keyof AF, string][]).map(([k, label]) => (
              <label key={k} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input type="checkbox" checked={f[k] as boolean} onChange={e => s(k, e.target.checked as AF[typeof k])}
                  className="h-3.5 w-3.5 rounded accent-primary-600" />
                <span className="text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <button disabled={busy} type="submit" className={btnSave}>Lưu thuộc tính</button>
      </form>
    </Modal>
  );
}

// ── Value manager modal ───────────────────────────────────────────────────────
function ValueManagerModal({ token, attr, busy, onAction, onClose }: {
  token: string; attr: Attribute; busy: boolean;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState({ value: '', sortOrder: 0, isActive: true });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ value: string; sortOrder: number; isActive: boolean } | null>(null);

  useEffect(() => { setNewVal(v => ({ ...v, sortOrder: attr.values.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1 })); }, [attr.values]);

  const startEdit = (v: AttributeValue) => { setEditingId(v.id); setEditForm({ value: v.value, sortOrder: v.sortOrder, isActive: v.isActive }); };
  const remove = async (v: AttributeValue) => {
    const ok = await confirm({ title: `Xóa "${v.value}"?`, description: 'Không thể xóa nếu đang được sản phẩm sử dụng.', confirmLabel: 'Xóa', destructive: true });
    if (ok) await onAction(() => deleteAttributeValue(token, v.id), 'Đã xóa giá trị.');
  };

  return (
    <Modal title={`Giá trị — ${attr.name}`} busy={busy} onClose={onClose} scrollableBody>
      <div className="space-y-1.5">
        {attr.values.length === 0 && !adding && (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có giá trị nào.</p>
        )}
        {attr.values.map(v => (
          editingId === v.id && editForm ? (
            <form key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/40 px-3 py-2"
              onSubmit={e => {
                e.preventDefault();
                void onAction(() => updateAttributeValue(token, v.id, editForm!), 'Đã cập nhật.')
                  .then(() => setEditingId(null));
              }}>
              <input autoFocus required maxLength={500} value={editForm.value}
                onChange={e => setEditForm(x => x && { ...x, value: e.target.value })}
                className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm" />
              <input type="number" min={0} value={editForm.sortOrder}
                onChange={e => setEditForm(x => x && { ...x, sortOrder: Number(e.target.value) })}
                className="w-16 rounded border border-slate-200 px-2 py-1 text-sm" />
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(x => x && { ...x, isActive: e.target.checked })} />
                Bật
              </label>
              <button type="submit" disabled={busy} className="rounded bg-primary-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">Lưu</button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium">Hủy</button>
            </form>
          ) : (
            <div key={v.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
              <span className={`min-w-0 flex-1 truncate text-sm ${v.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{v.value}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">#{v.sortOrder}</span>
              <button type="button" disabled={busy} onClick={() => void onAction(() => setAttributeValueStatus(token, v.id, !v.isActive), 'Đã cập nhật.')}
                className="shrink-0 text-slate-400 hover:text-slate-700 disabled:opacity-40" title={v.isActive ? 'Tắt' : 'Bật'}>
                {v.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => startEdit(v)} className="shrink-0 text-slate-400 hover:text-primary-600" title="Sửa">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={busy} onClick={() => void remove(v)} className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-40" title="Xóa">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        ))}
        {adding ? (
          <form className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/40 px-3 py-2"
            onSubmit={e => {
              e.preventDefault();
              void onAction(() => createAttributeValue(token, attr.id, newVal), 'Đã thêm giá trị.')
                .then(() => { setAdding(false); setNewVal(v => ({ ...v, value: '' })); });
            }}>
            <input autoFocus required maxLength={500} placeholder="Giá trị mới…" value={newVal.value}
              onChange={e => setNewVal(v => ({ ...v, value: e.target.value }))}
              className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm" />
            <input type="number" min={0} value={newVal.sortOrder}
              onChange={e => setNewVal(v => ({ ...v, sortOrder: Number(e.target.value) }))}
              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm" />
            <button type="submit" disabled={busy} className="rounded bg-primary-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">Thêm</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium">Hủy</button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600">
            <Plus className="h-3.5 w-3.5" /> Thêm giá trị
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Category links modal ──────────────────────────────────────────────────────
type LinkRow = CategoryLinkInput & { checked: boolean; name: string };

const CAT_FLAG_COLS: [keyof CategoryLinkInput, string][] = [
  ['isRequired', 'Bắt buộc'],
  ['showInForm', 'Form nhập'],
  ['showInDetail', 'Chi tiết SP'],
  ['usedInFilter', 'Bộ lọc'],
  ['requiredForBuildPC', 'Build PC'],
];

function CategoryLinksModal({ token, attr, categories, busy, onAction, onClose }: {
  token: string; attr: Attribute; categories: Category[]; busy: boolean;
  onAction: (work: () => Promise<unknown>, success: string, close?: () => void) => Promise<void>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<LinkRow[]>(() => {
    const linked = new Map(attr.categories.map(c => [c.id, c]));
    return categories.map(c => {
      const l = linked.get(c.id);
      return {
        categoryId: c.id, name: c.name, checked: !!l,
        sortOrder: l?.sortOrder ?? 0,
        isRequired: l?.isRequired ?? false,
        showInForm: l?.showInForm ?? true,
        showInDetail: l?.showInDetail ?? true,
        usedInFilter: l?.usedInFilter ?? true,
        requiredForBuildPC: l?.requiredForBuildPC ?? false,
      };
    });
  });

  const toggle = (id: number, key: keyof LinkRow, val: boolean | number) =>
    setRows(rs => rs.map(r => r.categoryId === id ? { ...r, [key]: val } : r));

  const handleSave = () => {
    const links: CategoryLinkInput[] = rows
      .filter(r => r.checked)
      .map(({ checked: _checked, name: _name, ...rest }) => rest);
    void onAction(() => setAttributeCategoryLinks(token, attr.id, links), 'Đã cập nhật danh mục.', onClose);
  };

  const checked = rows.filter(r => r.checked);
  return (
    <Modal
      title={`Danh mục — ${attr.name}`}
      busy={busy}
      onClose={onClose}
      size="lg"
      scrollableBody
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500">{checked.length} / {rows.length} danh mục được chọn</span>
          <button disabled={busy} onClick={handleSave} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            Lưu liên kết
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2 pr-3 text-left text-xs font-semibold text-slate-500">Danh mục</th>
              {CAT_FLAG_COLS.map(([k, l]) => (
                <th key={k} className="px-2 py-2 text-center text-xs font-semibold text-slate-500">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(r => (
              <tr key={r.categoryId} className={r.checked ? 'bg-primary-50/30' : 'hover:bg-slate-50/50'}>
                <td className="py-2 pr-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={r.checked}
                      onChange={e => toggle(r.categoryId, 'checked', e.target.checked)}
                      className="h-4 w-4 accent-primary-600" />
                    <span className={`text-sm ${r.checked ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{r.name}</span>
                  </label>
                </td>
                {CAT_FLAG_COLS.map(([k]) => (
                  <td key={k} className="px-2 py-2 text-center">
                    <input type="checkbox"
                      disabled={!r.checked || (k === 'requiredForBuildPC' && !attr.usedInBuildPC)}
                      checked={r[k] as boolean}
                      onChange={e => toggle(r.categoryId, k, e.target.checked)}
                      className="h-4 w-4 accent-primary-600 disabled:opacity-30"
                      title={k === 'requiredForBuildPC' && !attr.usedInBuildPC ? 'Bật "Dùng Build PC" trên thuộc tính trước' : undefined}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// ── Group members modal ───────────────────────────────────────────────────────
function GroupMembersModal({ token, group, attributes, busy, onAction, onClose }: {
  token: string; group: AttributeGroup; attributes: Attribute[]; busy: boolean;
  onAction: (work: () => Promise<unknown>, success: string, close?: () => void) => Promise<void>;
  onClose: () => void;
}) {
  const memberIds = new Set(group.members.map(m => m.id));
  const [selected, setSelected] = useState<Set<number>>(new Set(memberIds));
  const [orders, setOrders] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>();
    group.members.forEach(m2 => m.set(m2.id, m2.sortOrder));
    return m;
  });

  const toggle = (id: number) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSave = () => {
    const members = [...selected].map(id => ({ attributeId: id, sortOrder: orders.get(id) ?? 0 }));
    void onAction(() => setGroupMembers(token, group.id, members), 'Đã cập nhật thành viên nhóm.', onClose);
  };

  return (
    <Modal
      title={`Thành viên — ${group.name}`}
      busy={busy}
      onClose={onClose}
      scrollableBody
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500">{selected.size} thuộc tính</span>
          <button disabled={busy} onClick={handleSave} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            Lưu thành viên
          </button>
        </div>
      }
    >
      <div className="space-y-1">
        {attributes.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có thuộc tính nào.</p>
        )}
        {attributes.map(a => (
          <div key={a.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${selected.has(a.id) ? 'border-primary-200 bg-primary-50/40' : 'border-slate-100 bg-white'}`}>
            <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)}
              className="h-4 w-4 shrink-0 accent-primary-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{a.name}</p>
              <p className="font-mono text-xs text-slate-400">{a.slug}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[a.type]}`}>{TYPES[a.type]}</span>
            {selected.has(a.id) && (
              <input type="number" min={0} value={orders.get(a.id) ?? 0}
                onChange={e => setOrders(m => { const n = new Map(m); n.set(a.id, Number(e.target.value)); return n; })}
                className="w-16 shrink-0 rounded border border-slate-200 px-2 py-1 text-xs"
                title="Thứ tự trong nhóm"
              />
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Group sidebar panel ───────────────────────────────────────────────────────
function GroupSidebar({ groups, selectedId, busy, onSelect, onEdit, onToggle, onDelete, onMembers }: {
  groups: AttributeGroup[];
  selectedId: number | null;
  busy: boolean;
  onSelect: (id: number | null) => void;
  onEdit: (g: AttributeGroup) => void;
  onToggle: (g: AttributeGroup) => void;
  onDelete: (g: AttributeGroup) => void;
  onMembers: (g: AttributeGroup) => void;
}) {
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (menuOpenId === null) return;
    const close = () => setMenuOpenId(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpenId]);

  const rowBase = 'flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors';
  const rowActive = 'bg-primary-600 text-white';
  const rowIdle = 'text-slate-700 hover:bg-slate-100';

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => onSelect(null)}
        className={`${rowBase} ${selectedId === null ? rowActive : rowIdle} cursor-pointer items-center`}>
        <Tags className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left font-medium">Tất cả thuộc tính</span>
      </button>

      {groups.map(g => {
        const active = selectedId === g.id;
        const menuOpen = menuOpenId === g.id;
        return (
          <div key={g.id}
            className={`${rowBase} relative cursor-pointer ${active ? rowActive : rowIdle}`}
            onClick={() => { onSelect(g.id); setMenuOpenId(null); }}>
            <FolderOpen className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 break-words font-medium leading-snug">{g.name}</span>
            <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {g.members.length}
            </span>
            {/* ··· menu */}
            <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
              <button type="button" disabled={busy}
                onClick={() => setMenuOpenId(menuOpen ? null : g.id)}
                title="Thao tác"
                className={`rounded p-0.5 transition-colors ${active ? 'text-white/70 hover:bg-white/20' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 min-w-[168px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button type="button"
                    onClick={() => { onMembers(g); setMenuOpenId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                    <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />Quản lý thành viên
                  </button>
                  <button type="button"
                    onClick={() => { onEdit(g); setMenuOpenId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400" />Sửa nhóm
                  </button>
                  <button type="button"
                    onClick={() => { onToggle(g); setMenuOpenId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                    {g.isActive
                      ? <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      : <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                    {g.isActive ? 'Tắt nhóm' : 'Bật nhóm'}
                  </button>
                  <hr className="my-1 border-slate-100" />
                  <button type="button"
                    onClick={() => { onDelete(g); setMenuOpenId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />Xóa nhóm
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AttributeManager() {
  const token = useAuthStore(state => state.token);
  const confirm = useConfirm();

  // Data
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Modal state (undefined = closed, null = create-new, number = edit by id)
  const [groupFormId, setGroupFormId] = useState<number | null | undefined>(undefined);
  const [attrFormId, setAttrFormId] = useState<number | null | undefined>(undefined);
  const [valueManagerId, setValueManagerId] = useState<number | null>(null);
  const [categoryLinksId, setCategoryLinksId] = useState<number | null>(null);
  const [groupMembersId, setGroupMembersId] = useState<number | null>(null);

  // Derived modal targets
  const groupFormTarget = groupFormId != null ? groups.find(g => g.id === groupFormId) : undefined;
  const attrFormTarget = attrFormId != null ? attributes.find(a => a.id === attrFormId) : undefined;
  const valueManagerAttr = attributes.find(a => a.id === valueManagerId);
  const categoryLinksAttr = attributes.find(a => a.id === categoryLinksId);
  const groupMembersGroup = groups.find(g => g.id === groupMembersId);

  // Filtered attributes for the right panel
  const displayed = useMemo(() => {
    let list = attributes;
    if (selectedGroupId !== null) {
      list = list.filter(a => a.groups.some(g => g.id === selectedGroupId));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.slug.includes(q));
    }
    if (statusFilter === 'active') list = list.filter(a => a.isActive);
    if (statusFilter === 'inactive') list = list.filter(a => !a.isActive);
    return list;
  }, [attributes, selectedGroupId, search, statusFilter]);

  // Load
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ga, gb, gc] = await Promise.all([getGroups(token), getAttributes(token), getAdminCategories(token)]);
      setGroups(ga.groups);
      setAttributes(gb.attributes);
      setCategories(gc.categories);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  // Perform: wraps async work with busy/error/load cycle
  const perform = useCallback(async (work: () => Promise<unknown>, success: string, close?: () => void) => {
    if (!token || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await work(); close?.(); setMessage(success); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Thao tác không thành công.'); }
    finally { setBusy(false); }
  }, [token, busy, load]);

  // Group actions
  const removeGroup = async (g: AttributeGroup) => {
    const ok = await confirm({
      title: `Xóa nhóm "${g.name}"?`,
      description: 'Các thuộc tính trong nhóm không bị xóa — chỉ quan hệ nhóm bị xóa.',
      confirmLabel: 'Xóa nhóm', destructive: true,
    });
    if (ok) {
      void perform(() => deleteGroup(token!, g.id), 'Đã xóa nhóm.');
      if (selectedGroupId === g.id) setSelectedGroupId(null);
    }
  };

  // Attribute actions
  const removeAttr = async (a: Attribute) => {
    const ok = await confirm({
      title: `Xóa thuộc tính "${a.name}"?`,
      description: 'Không thể xóa nếu đang được sản phẩm sử dụng. Hãy tắt thuộc tính thay vì xóa.',
      confirmLabel: 'Xóa thuộc tính', destructive: true,
    });
    if (ok) void perform(() => deleteAttribute(token!, a.id), 'Đã xóa thuộc tính.');
  };

  const selectedGroupName = selectedGroupId !== null ? groups.find(g => g.id === selectedGroupId)?.name : null;

  if (!token) return null;

  return (
    <section>
      <AdminPageHeader
        title="Thuộc tính"
        action={
          <button type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setGroupFormId(null)}>
            <Layers className="h-4 w-4" /> Thêm nhóm
          </button>
        }
      />
      <AdminFeedback message={message} error={error} />

      <div className="flex gap-5 lg:items-start">
        {/* ── Left: Group sidebar (desktop only) ──────────────────────────── */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Nhóm</p>
            {loading ? (
              <p className="py-4 text-center text-xs text-slate-400">Đang tải…</p>
            ) : (
              <GroupSidebar
                groups={groups}
                selectedId={selectedGroupId}
                busy={busy}
                onSelect={id => { setSelectedGroupId(id); setExpandedId(null); }}
                onEdit={g => setGroupFormId(g.id)}
                onToggle={g => void perform(() => setGroupStatus(token, g.id, !g.isActive), 'Đã cập nhật nhóm.')}
                onDelete={removeGroup}
                onMembers={g => setGroupMembersId(g.id)}
              />
            )}
          </div>
        </aside>

        {/* ── Right: Attribute panel ──────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Mobile: group chip row (inside right panel, above toolbar) */}
          <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden" role="tablist">
            <button role="tab" aria-selected={selectedGroupId === null} type="button"
              onClick={() => setSelectedGroupId(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${selectedGroupId === null ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              Tất cả
            </button>
            {groups.map(g => (
              <button key={g.id} role="tab" aria-selected={selectedGroupId === g.id} type="button"
                onClick={() => setSelectedGroupId(g.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${selectedGroupId === g.id ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                {g.name} <span className="opacity-70">({g.members.length})</span>
              </button>
            ))}
          </div>
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input type="search" placeholder="Tìm thuộc tính…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-300" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none">
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang bật</option>
              <option value="inactive">Đang tắt</option>
            </select>
            <button type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              onClick={() => setAttrFormId(null)}>
              <Plus className="h-4 w-4" /> Thêm thuộc tính
            </button>
          </div>

          {selectedGroupName && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">{selectedGroupName}</span>
              <span className="text-xs text-slate-400">{displayed.length} thuộc tính</span>
              <button type="button" onClick={() => setGroupMembersId(selectedGroupId)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <Users className="h-3.5 w-3.5" /> Quản lý thành viên
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
            {loading ? (
              <p role="status" className="p-6 text-sm text-slate-500">Đang tải…</p>
            ) : displayed.length === 0 ? (
              <EmptyState variant="inline" icon={Tags}
                title={search || statusFilter || selectedGroupId ? 'Không tìm thấy thuộc tính phù hợp.' : 'Chưa có thuộc tính nào.'}
                description={search || statusFilter || selectedGroupId ? 'Thử thay đổi bộ lọc.' : 'Thuộc tính chuẩn hóa được dùng cho bộ lọc và Mega Menu.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5">Thuộc tính</th>
                      <th className="px-3 py-2.5">Loại</th>
                      <th className="px-3 py-2.5">Giá trị</th>
                      <th className="px-3 py-2.5">Danh mục</th>
                      <th className="px-3 py-2.5">Cấu hình</th>
                      <th className="px-3 py-2.5">Thứ tự</th>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      <th className="px-3 py-2.5">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayed.map(attribute => {
                      const hasValues = attribute.type === 'SELECT' || attribute.type === 'MULTI_SELECT';
                      const isExpanded = expandedId === attribute.id;
                      const visibleVals = attribute.values.slice(0, CHIP_LIMIT);
                      const hiddenCount = attribute.values.length - CHIP_LIMIT;
                      return (
                        <Fragment key={attribute.id}>
                          <tr className={`transition-colors hover:bg-slate-50/70 ${isExpanded ? 'bg-primary-50/30' : ''}`}>
                            {/* Name/Slug + groups */}
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-slate-800">{attribute.name}</p>
                              <p className="font-mono text-xs text-slate-400">/{attribute.slug}</p>
                              {attribute.unit && <p className="mt-0.5 text-[10px] text-slate-400">Đơn vị: {attribute.unit}</p>}
                              {attribute.groups.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-0.5">
                                  {attribute.groups.map(g => (
                                    <span key={g.id} className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0 text-[10px] text-slate-500">
                                      <FolderOpen className="h-2.5 w-2.5" />{g.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            {/* Type badge */}
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[attribute.type]}`}>
                                {TYPES[attribute.type]}
                              </span>
                            </td>
                            {/* Values */}
                            <td className="px-3 py-2.5">
                              {hasValues ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {visibleVals.map(v => (
                                    <span key={v.id} className={`rounded-md border bg-white px-1.5 py-0.5 text-xs ${v.isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{v.value}</span>
                                  ))}
                                  {hiddenCount > 0 && (
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">+{hiddenCount}</span>
                                  )}
                                  <button type="button" onClick={() => setValueManagerId(attribute.id)}
                                    className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="Quản lý giá trị">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  {attribute.values.length === 0 && (
                                    <span className="text-xs text-slate-400">Chưa có</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            {/* Categories */}
                            <td className="px-3 py-2.5">
                              <button type="button"
                                onClick={() => setCategoryLinksId(attribute.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">
                                {attribute.categories.length > 0
                                  ? `${attribute.categories.length} danh mục`
                                  : <span className="text-slate-400">Gán danh mục</span>}
                              </button>
                            </td>
                            {/* Config flags */}
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {attribute.usedInFilter && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Lọc</span>}
                                {attribute.usedInBuildPC && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">Build</span>}
                                {!attribute.showInDetail && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Ẩn</span>}
                              </div>
                            </td>
                            {/* Sort order */}
                            <td className="px-3 py-2.5">
                              <input aria-label={`Thứ tự ${attribute.name}`} type="number" min={0}
                                defaultValue={attribute.sortOrder}
                                onBlur={e => { const v = Number(e.target.value); if (Number.isSafeInteger(v) && v >= 0 && v !== attribute.sortOrder) void perform(() => setAttributeOrder(token, attribute.id, v), 'Đã cập nhật thứ tự.'); }}
                                className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm" />
                            </td>
                            {/* Status */}
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${attribute.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {attribute.isActive ? 'Bật' : 'Tắt'}
                              </span>
                            </td>
                            {/* Actions */}
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                <button type="button" onClick={() => setAttrFormId(attribute.id)} className={act} title="Sửa"><Pencil className="h-3.5 w-3.5" />Sửa</button>
                                <button type="button" disabled={busy} onClick={() => void perform(() => setAttributeStatus(token, attribute.id, !attribute.isActive), 'Đã cập nhật.')} className={act}>
                                  {attribute.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  {attribute.isActive ? 'Tắt' : 'Bật'}
                                </button>
                                <button type="button" disabled={busy} onClick={() => void removeAttr(attribute)} className={`${act} text-red-600 hover:border-red-200 hover:bg-red-50`}><Trash2 className="h-3.5 w-3.5" />Xóa</button>
                              </div>
                            </td>
                          </tr>
                          {/* Expanded value row */}
                          {isExpanded && hasValues && (
                            <tr>
                              <td colSpan={8} className="bg-slate-50/60 px-4 py-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-xs font-semibold text-slate-600">Giá trị — {attribute.name}</p>
                                  <button type="button" onClick={() => setValueManagerId(attribute.id)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                    <Pencil className="h-3 w-3" /> Quản lý giá trị
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {attribute.values.map(v => (
                                    <span key={v.id} className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-xs ${v.isActive ? 'text-slate-700' : 'opacity-50'}`}>
                                      {v.value}<span className="text-slate-400">#{v.sortOrder}</span>
                                    </span>
                                  ))}
                                  {attribute.values.length === 0 && <span className="text-xs text-slate-400">Chưa có giá trị.</span>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Group form modal ──────────────────────────────────────────────── */}
      {groupFormId !== undefined && (
        <GroupFormModal
          group={groupFormTarget}
          busy={busy}
          onClose={() => setGroupFormId(undefined)}
          onSave={data => void perform(
            () => groupFormTarget ? updateGroup(token!, groupFormTarget.id, data) : createGroup(token!, data),
            groupFormTarget ? 'Đã cập nhật nhóm.' : 'Đã tạo nhóm.',
            () => setGroupFormId(undefined),
          )}
        />
      )}

      {/* ── Attribute form modal ──────────────────────────────────────────── */}
      {attrFormId !== undefined && (
        <AttributeFormModal
          attr={attrFormTarget}
          sortHint={attributes.reduce((m, a) => Math.max(m, a.sortOrder), -1) + 1}
          busy={busy}
          onClose={() => setAttrFormId(undefined)}
          onSave={data => void perform(
            () => attrFormTarget ? updateAttribute(token!, attrFormTarget.id, data) : createAttribute(token!, data),
            attrFormTarget ? 'Đã cập nhật thuộc tính.' : 'Đã tạo thuộc tính.',
            () => setAttrFormId(undefined),
          )}
        />
      )}

      {/* ── Value manager modal ───────────────────────────────────────────── */}
      {valueManagerAttr && (
        <ValueManagerModal
          token={token!}
          attr={valueManagerAttr}
          busy={busy}
          onAction={perform}
          onClose={() => setValueManagerId(null)}
        />
      )}

      {/* ── Category links modal ──────────────────────────────────────────── */}
      {categoryLinksAttr && (
        <CategoryLinksModal
          token={token!}
          attr={categoryLinksAttr}
          categories={categories}
          busy={busy}
          onAction={perform}
          onClose={() => setCategoryLinksId(null)}
        />
      )}

      {/* ── Group members modal ───────────────────────────────────────────── */}
      {groupMembersGroup && (
        <GroupMembersModal
          token={token!}
          group={groupMembersGroup}
          attributes={attributes}
          busy={busy}
          onAction={perform}
          onClose={() => setGroupMembersId(null)}
        />
      )}
    </section>
  );
}
