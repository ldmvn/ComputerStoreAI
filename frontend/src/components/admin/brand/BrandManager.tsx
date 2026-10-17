'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import { Badge, Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import AdminFilterBar from '@/components/admin/AdminFilterBar';
import { adminActionButtonClass, adminActionGroupClass } from '@/components/admin/adminActionStyles';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth.store';
import { createBrand, deleteBrand, getAdminBrands, setBrandStatus, updateBrand, type Brand } from '@/services/brand.service';
import { mediaUrl } from '@/services/http.client';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import BrandForm from './BrandForm';

const actionClass = adminActionButtonClass;

export default function BrandManager() {
  const token = useAuthStore(state => state.token);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<Brand | null | undefined>(undefined);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setBrands((await getAdminBrands(token)).brands); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được thương hiệu.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const perform = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Thao tác không thành công.'); }
    finally { setBusy(false); }
  };
  const save = (body: FormData) => void perform(async () => {
    if (editor) await updateBrand(token!, editor.id, body);
    else await createBrand(token!, body);
    setEditor(undefined);
  }, editor ? 'Đã cập nhật thương hiệu.' : 'Đã tạo thương hiệu.');
  const toggle = (brand: Brand) => void perform(() => setBrandStatus(token!, brand.id, !brand.isActive), brand.isActive ? 'Đã ẩn thương hiệu.' : 'Đã hiển thị thương hiệu.');
  const remove = async (brand: Brand) => {
    const accepted = await confirm({
      title: `Xóa thương hiệu "${brand.name}"?`,
      description: 'Thao tác này không thể hoàn tác. Vui lòng chuyển các sản phẩm sang thương hiệu khác trước khi xóa.',
      confirmLabel: 'Xóa thương hiệu',
      destructive: true,
    });
    if (!accepted) return;
    void perform(() => deleteBrand(token!, brand.id), 'Đã xóa thương hiệu.');
  };

  const filtered = brands.filter(brand => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (query && !brand.name.toLocaleLowerCase('vi').includes(query) && !brand.slug.toLocaleLowerCase('vi').includes(query)) return false;
    if (status === 'active' && !brand.isActive) return false;
    if (status === 'inactive' && brand.isActive) return false;
    return true;
  });

  return (
    <section>
      <AdminPageHeader title="Thương hiệu" />
      <AdminFeedback message={message} error={error} />
      <AdminFilterBar className="flex flex-wrap items-center gap-2 p-3">
        <input aria-label="Tìm kiếm thương hiệu" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên hoặc slug..." className="min-w-[160px] flex-[1_1_200px] rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <select aria-label="Lọc trạng thái thương hiệu" value={status} onChange={event => setStatus(event.target.value)} className="flex-[1_1_140px] rounded-lg border border-slate-200 px-2 py-2 text-sm">
          <option value="">Trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã ẩn</option>
        </select>
        <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button--primary inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />Thêm thương hiệu
        </button>
      </AdminFilterBar>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
        {loading
          ? <div role="status" className="space-y-3 p-5">{[0, 1, 2].map(item => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
          : filtered.length === 0
            ? <EmptyState variant="inline" icon={Badge} title={brands.length ? 'Không tìm thấy thương hiệu phù hợp.' : 'Chưa có thương hiệu nào.'} action={brands.length === 0 ? <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button--primary inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Tạo thương hiệu đầu tiên</button> : undefined} />
            : <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Logo</th>
                      <th className="px-3 py-2.5">Thương hiệu</th>
                      <th className="px-3 py-2.5">Website</th>
                      <th className="px-3 py-2.5 text-right">Sản phẩm</th>
                      <th className="px-3 py-2.5 text-right">Thứ tự</th>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      <th className="px-3 py-2.5">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(brand => (
                      <tr key={brand.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2">
                          {brand.logoUrl
                            ? <img src={mediaUrl(brand.logoUrl)} alt={`Logo ${brand.name}`} className="h-9 w-14 rounded-md border border-slate-100 bg-white object-contain p-0.5" />
                            : <div className="flex h-9 w-14 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">Không có</div>}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{brand.name}</p>
                          <p className="font-mono text-xs text-slate-500">/{brand.slug}</p>
                        </td>
                        <td className="px-3 py-2">
                          {brand.websiteUrl
                            ? <a href={brand.websiteUrl} target="_blank" rel="noreferrer" className="max-w-52 truncate text-primary-700 hover:underline">{brand.websiteUrl}</a>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{brand.productCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{brand.sortOrder}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${brand.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {brand.isActive ? 'Đang hoạt động' : 'Đã ẩn'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className={adminActionGroupClass}>
                            <button type="button" onClick={() => setEditor(brand)} disabled={busy} className={actionClass} aria-label={`Sửa ${brand.name}`}>
                              <Pencil className="h-3.5 w-3.5" />Sửa
                            </button>
                            <button type="button" onClick={() => toggle(brand)} disabled={busy} className={actionClass} aria-label={brand.isActive ? `Ẩn ${brand.name}` : `Hiện ${brand.name}`}>
                              {brand.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              {brand.isActive ? 'Ẩn' : 'Hiện'}
                            </button>
                            <button type="button" onClick={() => void remove(brand)} disabled={busy || brand.productCount > 0} className={`${actionClass} text-red-600 hover:border-red-200 hover:bg-red-50`} aria-label={`Xóa ${brand.name}`} title={brand.productCount > 0 ? 'Chuyển sản phẩm sang thương hiệu khác trước khi xóa' : undefined}>
                              <Trash2 className="h-3.5 w-3.5" />Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
      </div>

      {!loading && brands.length > 0 && (
        <button type="button" onClick={() => void load()} className="ui-button mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4" />Tải lại
        </button>
      )}

      {editor !== undefined && (
        <BrandForm brand={editor} busy={busy} error={error} onClose={() => { if (!busy) { setEditor(undefined); setError(''); } }} onSave={save} />
      )}
    </section>
  );
}
