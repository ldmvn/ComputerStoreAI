'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import AdminFilterBar from '@/components/admin/AdminFilterBar';
import { adminActionButtonClass, adminActionGroupClass } from '@/components/admin/adminActionStyles';
import EmptyState from '@/components/ui/EmptyState';
import CategoryIcon from '@/components/category/CategoryIcon';
import { useAuthStore } from '@/store/auth.store';
import { createCategory, deleteCategory, getAdminCategories, setCategoryOrder, setCategoryStatus, updateCategory, type Category, type CategoryInput } from '@/services/category.service';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import CategoryForm from './CategoryForm';

type Filters = { search: string; status: string; type: string; sort: string };

function compareCategories(first: Category, second: Category, sort: string) {
  if (sort === 'name') return first.name.localeCompare(second.name, 'vi');
  if (sort === 'updated') return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
  return first.sortOrder - second.sortOrder || first.name.localeCompare(second.name, 'vi');
}

function flattenTree(categories: Category[], sort: string) {
  const children = new Map<number | null, Category[]>();
  categories.forEach(category => children.set(category.parentId, [...(children.get(category.parentId) || []), category]));
  children.forEach(items => items.sort((first, second) => compareCategories(first, second, sort)));
  const result: { category: Category; depth: number }[] = [];
  const visited = new Set<number>();
  const visit = (category: Category, depth: number) => {
    if (visited.has(category.id)) return;
    visited.add(category.id);
    result.push({ category, depth });
    (children.get(category.id) || []).forEach(child => visit(child, depth + 1));
  };
  (children.get(null) || []).forEach(category => visit(category, 0));
  categories.filter(category => !visited.has(category.id)).sort((a, b) => compareCategories(a, b, sort)).forEach(category => visit(category, 0));
  return result;
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function CategoryManager() {
  const token = useAuthStore(state => state.token);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', type: '', sort: 'order' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<Category | null | undefined>(undefined);
  const [orderDrafts, setOrderDrafts] = useState<Record<number, string>>({});
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setCategories((await getAdminCategories(token)).categories); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh mục.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const perform = async (work: () => Promise<unknown>, success: string) => {
    if (!token || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Thao tác không thành công.'); }
    finally { setBusy(false); }
  };

  const save = (data: CategoryInput) => void perform(async () => {
    if (editor) await updateCategory(token!, editor.id, data);
    else await createCategory(token!, data);
    setEditor(undefined);
  }, editor ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục.');

  const toggle = (category: Category) => void perform(() => setCategoryStatus(token!, category.id, !category.isActive), category.isActive ? 'Đã ẩn danh mục.' : 'Đã hiển thị danh mục.');
  const remove = async (category: Category) => {
    const accepted = await confirm({
      title: `Xóa danh mục “${category.name}”?`,
      description: 'Thao tác này không thể hoàn tác. Các danh mục con và sản phẩm liên quan có thể bị ảnh hưởng.',
      confirmLabel: 'Xóa danh mục',
      destructive: true,
    });
    if (!accepted) return;
    void perform(() => deleteCategory(token!, category.id), 'Đã xóa danh mục.');
  };
  const updateOrder = (category: Category) => {
    const raw = orderDrafts[category.id];
    if (raw === undefined) return;
    const order = Number(raw);
    if (!Number.isSafeInteger(order) || order < 0) { setError('Thứ tự phải là số nguyên từ 0.'); setOrderDrafts(current => { const next = { ...current }; delete next[category.id]; return next; }); return; }
    setOrderDrafts(current => { const next = { ...current }; delete next[category.id]; return next; });
    if (order !== category.sortOrder) void perform(() => setCategoryOrder(token!, category.id, order), 'Đã cập nhật thứ tự danh mục.');
  };

  const filtered = categories.filter(category => {
    const query = filters.search.trim().toLocaleLowerCase('vi');
    if (query && !category.name.toLocaleLowerCase('vi').includes(query) && !category.slug.toLocaleLowerCase('vi').includes(query)) return false;
    if (filters.status === 'active' && !category.isActive) return false;
    if (filters.status === 'inactive' && category.isActive) return false;
    if (filters.type === 'root' && category.parentId !== null) return false;
    if (filters.type === 'child' && category.parentId === null) return false;
    return true;
  });
  const rows = flattenTree(filtered, filters.sort);
  const actionClass = adminActionButtonClass;

  if (!token) return null;
  return (
    <section>
      <AdminPageHeader title="Danh mục" />
      <AdminFeedback message={message} error={error} />
      <AdminFilterBar className="flex flex-wrap items-center gap-2 p-3">
        <input aria-label="Tìm kiếm danh mục" value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} placeholder="Tìm tên hoặc slug..." className="min-w-[160px] flex-[1_1_200px] rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <select aria-label="Lọc trạng thái" value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))} className="flex-[1_1_120px] rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="">Trạng thái</option><option value="active">Đang hiển thị</option><option value="inactive">Đang ẩn</option></select>
        <select aria-label="Lọc loại danh mục" value={filters.type} onChange={event => setFilters(current => ({ ...current, type: event.target.value }))} className="flex-[1_1_120px] rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="">Loại</option><option value="root">Cấp 1</option><option value="child">Danh mục con</option></select>
        <select aria-label="Sắp xếp danh mục" value={filters.sort} onChange={event => setFilters(current => ({ ...current, sort: event.target.value }))} className="flex-[1_1_140px] rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="order">Thứ tự hiển thị</option><option value="name">Tên A-Z</option><option value="updated">Cập nhật gần đây</option></select>
        <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button--primary inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Thêm danh mục</button>
      </AdminFilterBar>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
        {loading ? <div className="space-y-3 p-5" role="status" aria-label="Đang tải danh mục">{[0, 1, 2, 3].map(item => <div key={item} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>
          : rows.length === 0 ? <EmptyState variant="inline" icon={FolderPlus} title={categories.length ? 'Không tìm thấy danh mục phù hợp.' : 'Chưa có danh mục nào.'} action={categories.length === 0 ? <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button--primary inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Tạo danh mục đầu tiên</button> : undefined} />
            : <div className="overflow-x-auto"><table className="w-full min-w-[970px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Icon</th><th className="px-3 py-2.5">Tên danh mục</th><th className="px-3 py-2.5">Danh mục cha</th><th className="px-3 py-2.5">Đường dẫn</th><th className="px-3 py-2.5">Sản phẩm</th><th className="px-3 py-2.5">Thứ tự</th><th className="px-3 py-2.5">Trạng thái</th><th className="px-3 py-2.5">Cập nhật</th><th className="px-3 py-2.5">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(({ category, depth }) => <tr key={category.id} className="hover:bg-slate-50/70"><td className="px-3 py-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><CategoryIcon name={category.icon} /></span></td><td className="px-3 py-2"><div className="flex min-w-40 items-center gap-2" style={{ paddingLeft: Math.min(depth, 4) * 18 }}><span className="truncate font-medium text-slate-800">{depth > 0 && <span className="mr-2 text-slate-400" aria-hidden="true">└</span>}{category.name}</span></div></td><td className="px-3 py-2 text-slate-600">{category.parent?.name || '—'}</td><td className="px-3 py-2 font-mono text-xs text-slate-500">/{category.slug}</td><td className="px-3 py-2 tabular-nums text-slate-700">{category.productCount}</td><td className="px-3 py-2"><input aria-label={`Thứ tự ${category.name}`} type="number" min="0" step="1" value={orderDrafts[category.id] ?? category.sortOrder} onChange={event => setOrderDrafts(current => ({ ...current, [category.id]: event.target.value }))} onBlur={() => updateOrder(category)} className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm" /></td><td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${category.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{category.isActive ? 'Hiển thị' : 'Đang ẩn'}</span></td><td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{formattedDate(category.updatedAt)}</td><td className="px-3 py-2"><div className={adminActionGroupClass}><button type="button" aria-label={`Sửa ${category.name}`} onClick={() => setEditor(category)} className={actionClass}><Pencil className="h-3.5 w-3.5" />Sửa</button><button type="button" aria-label={`${category.isActive ? 'Ẩn' : 'Hiện'} ${category.name}`} disabled={busy} onClick={() => toggle(category)} className={actionClass}>{category.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{category.isActive ? 'Ẩn' : 'Hiện'}</button><button type="button" aria-label={`Xóa ${category.name}`} disabled={busy} onClick={() => remove(category)} className={`${actionClass} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`}><Trash2 className="h-3.5 w-3.5" />Xóa</button></div></td></tr>)}</tbody></table></div>}
      </div>
      {editor !== undefined && <CategoryForm category={editor} categories={categories} busy={busy} error={error} onClose={() => { if (!busy) { setEditor(undefined); setError(''); } }} onSave={save} />}
    </section>
  );
}
