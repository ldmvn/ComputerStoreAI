'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import { Edit3, Eye, EyeOff, PackageOpen, Plus, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import AdminFilterBar from '@/components/admin/AdminFilterBar';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/auth.store';
import type { Product } from '@/types/product.type';
import { mediaUrl } from '@/services/http.client';
import { createProduct, deleteProduct, getAdminProduct, getAdminProducts, setProductStatus, updateProduct, type ProductListQuery } from '@/services/product.service';
import { getAdminCategories, type Category } from '@/services/category.service';
import { getAdminBrands, type Brand } from '@/services/brand.service';
import { addProductsToSection, removeProductFromSection } from '@/services/productSection.service';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import ProductDetail from './ProductDetail';
import ProductForm from './ProductForm';
import { adminActionButtonClass, adminActionGroupClass } from '@/components/admin/adminActionStyles';

const emptyQuery: ProductListQuery = { page: 1, limit: 10, sort: 'newest' };
const actionClass = adminActionButtonClass;

export default function ProductManager() {
  const token = useAuthStore(state => state.token);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, outOfStock: 0, inactive: 0 });
  const [query, setQuery] = useState<ProductListQuery>(emptyQuery);
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<Product | null | undefined>(undefined);
  const [detail, setDetail] = useState<Product | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async (nextQuery: ProductListQuery) => {
    if (!token) return;
    setLoading(true); setError('');
    try { const result = await getAdminProducts(token, nextQuery); setProducts(result.products); setMeta(result.meta); setStats(result.stats); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được sản phẩm.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { const timer = window.setTimeout(() => setQuery(current => ({ ...current, search, page: 1 })), 350); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => { void load(query); }, [load, query]);
  useEffect(() => {
    if (!token) return;
    getAdminCategories(token).then(result => setCategories(result.categories)).catch(() => {});
    getAdminBrands(token).then(result => setBrands(result.brands)).catch(() => {});
  }, [token]);

  const action = async (work: () => Promise<unknown>, success: string) => { if (!token || busy) return; setBusy(true); setError(''); try { await work(); setMessage(success); await load(query); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Thao tác không thành công.'); } finally { setBusy(false); } };
  const save = (body: FormData, sections: { add: number[]; remove: number[] }) => void action(async () => {
    let productId: number;
    if (editor) { await updateProduct(token!, editor.id, body); productId = editor.id; }
    else { const result = await createProduct(token!, body); productId = result.product.id; }
    await Promise.all([
      ...sections.add.map(sectionId => addProductsToSection(token!, sectionId, [productId]).catch(() => {})),
      ...sections.remove.map(sectionId => removeProductFromSection(token!, sectionId, productId).catch(() => {})),
    ]);
    setEditor(undefined);
  }, editor ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.');
  const openDetail = async (product: Product) => { try { setDetail((await getAdminProduct(token!, product.id)).product); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được chi tiết.'); } };
  const removeProduct = async (product: Product) => {
    const accepted = await confirm({
      title: `Xóa sản phẩm “${product.name}”?`,
      description: 'Thao tác này không thể hoàn tác. Sản phẩm sẽ bị ẩn khỏi gian hàng.',
      confirmLabel: 'Xóa sản phẩm',
      destructive: true,
    });
    if (!accepted) return;
    void action(() => deleteProduct(token!, product.id), 'Đã ẩn sản phẩm.');
  };
  if (!token) return null;
  return <section>
    <AdminPageHeader title="Quản lý sản phẩm" />
    <AdminFeedback message={message} error={error} />
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Tổng sản phẩm', stats.total, 'text-slate-900'], ['Đang bán', stats.active, 'text-green-700'], ['Hết hàng', stats.outOfStock, 'text-red-600'], ['Đang ẩn', stats.inactive, 'text-slate-500']].map(([label, value, color]) => <div key={String(label)} className="ui-card rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/[0.03]"><p className="text-xs text-slate-500">{label}</p><p className={`mt-0.5 text-xl font-semibold ${color}`}>{value}</p></div>)}</div>
    <AdminFilterBar className="flex flex-wrap items-center gap-2 p-3">
      <input aria-label="Tìm kiếm sản phẩm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên, Mã SP, slug..." className="min-w-[180px] flex-[1_1_200px] rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <select aria-label="Lọc theo danh mục" value={query.category || ''} onChange={event => setQuery(current => ({ ...current, category: event.target.value, page: 1 }))} className="flex-[1_1_110px] rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="">Danh mục</option>{categories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}</select>
      <select aria-label="Lọc theo thương hiệu" value={query.brand || ''} onChange={event => setQuery(current => ({ ...current, brand: event.target.value, page: 1 }))} className="flex-[1_1_110px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"><option value="">Thương hiệu</option>{brands.map(brand => <option key={brand.id} value={brand.slug}>{brand.name}</option>)}</select>
      <select aria-label="Lọc theo trạng thái" value={query.status || ''} onChange={event => setQuery(current => ({ ...current, status: event.target.value, page: 1 }))} className="flex-[1_1_100px] rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="">Trạng thái</option><option value="active">Đang bán</option><option value="inactive">Đang ẩn</option><option value="outOfStock">Hết hàng</option></select>
      <select aria-label="Lọc theo tồn kho" value={query.stock || ''} onChange={event => setQuery(current => ({ ...current, stock: event.target.value, page: 1 }))} className="flex-[1_1_90px] rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="">Tồn kho</option><option value="low">Sắp hết</option><option value="out">Hết hàng</option></select>
      <select aria-label="Sắp xếp sản phẩm" value={query.sort || 'newest'} onChange={event => setQuery(current => ({ ...current, sort: event.target.value, page: 1 }))} className="flex-[1_1_100px] rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="priceAsc">Giá tăng</option><option value="priceDesc">Giá giảm</option><option value="nameAsc">Tên A-Z</option><option value="nameDesc">Tên Z-A</option><option value="stockAsc">Kho tăng</option><option value="stockDesc">Kho giảm</option></select>
      <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button--primary inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Thêm sản phẩm</button>
    </AdminFilterBar>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]"><div className="overflow-x-auto">{loading ? <p role="status" className="p-8 text-sm text-slate-500">Đang tải sản phẩm...</p> : !products.length ? <EmptyState variant="inline" icon={PackageOpen} title="Không có sản phẩm nào khớp với bộ lọc." description="Hãy đổi từ khóa hoặc xóa bớt điều kiện lọc." /> : <table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-3 py-2.5">Ảnh</th><th scope="col" className="px-3 py-2.5">Sản phẩm</th><th scope="col" className="px-3 py-2.5">Mã SP</th><th scope="col" className="px-3 py-2.5">Danh mục</th><th scope="col" className="px-3 py-2.5 text-right">Giá bán</th><th scope="col" className="px-3 py-2.5 text-right">Kho</th><th scope="col" className="px-3 py-2.5">Trạng thái</th><th scope="col" className="px-3 py-2.5">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map(product => <tr key={product.id} className="hover:bg-slate-50"><td className="px-3 py-2">{product.primaryImage ? <img src={mediaUrl(product.primaryImage)} alt={product.name} className="h-9 w-9 rounded-md object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">N/A</div>}</td><td className="max-w-[220px] px-3 py-2"><button type="button" onClick={() => void openDetail(product)} aria-label={`Xem chi tiết ${product.name}`} className="ui-link line-clamp-2 text-left font-medium leading-snug text-slate-800 hover:text-primary-600">{product.name}</button><p className="truncate text-xs text-slate-500">{product.slug}</p></td><td className="px-3 py-2 font-mono text-xs">{product.sku}</td><td className="px-3 py-2 text-slate-600">{product.category || '-'}</td><td className="px-3 py-2 text-right font-semibold tabular-nums text-primary-600">{product.price.toLocaleString('vi-VN')}đ{product.originalPrice != null && product.originalPrice < product.price && <span title="Giá gốc thấp hơn giá bán nên gian hàng không hiển thị giảm giá" className="mt-0.5 block text-[11px] font-medium text-amber-700">Giá gốc không hợp lệ</span>}</td><td className="px-3 py-2 text-right tabular-nums">{product.stockQuantity}</td><td className="px-3 py-2"><div className="flex flex-col gap-1"><span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${product.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{product.isActive ? 'Đang bán' : 'Đang ẩn'}</span><span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${product.stockStatus === 'OUT_OF_STOCK' ? 'bg-red-50 text-red-600' : product.stockStatus === 'LOW_STOCK' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>{product.stockStatus === 'OUT_OF_STOCK' ? 'Hết hàng' : product.stockStatus === 'LOW_STOCK' ? 'Sắp hết' : 'Còn hàng'}</span></div></td><td className="px-3 py-2"><div className={adminActionGroupClass}><button type="button" aria-label={`Sửa ${product.name}`} className={actionClass} onClick={async () => setEditor((await getAdminProduct(token!, product.id)).product)}><Edit3 className="h-3.5 w-3.5" />Sửa</button><button type="button" aria-label={`${product.isActive ? 'Ẩn' : 'Hiện'} ${product.name}`} className={actionClass} disabled={busy} onClick={() => void action(() => setProductStatus(token!, product.id, !product.isActive), product.isActive ? 'Đã ẩn sản phẩm.' : 'Đã bật sản phẩm.')}>{product.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{product.isActive ? 'Ẩn' : 'Hiện'}</button><button type="button" aria-label={`Xóa ${product.name}`} className={`${actionClass} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`} disabled={busy} onClick={() => void removeProduct(product)}><Trash2 className="h-3.5 w-3.5" />Xóa</button></div></td></tr>)}</tbody></table>}</div>{!loading && <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-sm text-slate-500"><span>{meta.total} sản phẩm</span><div className="flex gap-2"><button type="button" disabled={meta.page <= 1} onClick={() => setQuery(current => ({ ...current, page: current.page! - 1 }))} className={actionClass}>Trước</button><span className="px-2 py-2">{meta.totalPages ? `${meta.page}/${meta.totalPages}` : '0/0'}</span><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setQuery(current => ({ ...current, page: current.page! + 1 }))} className={actionClass}>Sau</button></div></div>}</div>
    {editor !== undefined && <ProductForm product={editor || undefined} categories={categories} brands={brands} busy={busy} error={error} onClose={() => setEditor(undefined)} onSave={save} />}{detail && <ProductDetail product={detail} onClose={() => setDetail(null)} onEdit={() => { setEditor(detail); setDetail(null); }} />}
  </section>;
}
