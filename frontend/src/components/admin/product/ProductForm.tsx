'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ImagePlus, LayoutGrid, Plus, Search, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { Product } from '@/types/product.type';
import type { Category } from '@/services/category.service';
import type { Brand } from '@/services/brand.service';
import { mediaUrl } from '@/services/http.client';
import { getCategoryAttributes, type CategoryBoundAttribute } from '@/services/attribute.service';
import { getProductSections } from '@/services/productSection.service';
import type { ProductSection } from '@/types/productSection.type';
import { useAuthStore } from '@/store/auth.store';

function slugify(value: string) { return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

const inputCls = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm';
const sectionHeadCls = 'mb-3 text-xs font-semibold uppercase tracking-wider text-primary-600';

export default function ProductForm({ product, categories, brands, busy, error, onClose, onSave }: {
  product?: Product; categories: Category[]; brands: Brand[];
  busy: boolean; error?: string; onClose: () => void;
  onSave: (data: FormData, sections: { add: number[]; remove: number[] }) => void;
}) {
  const token = useAuthStore(state => state.token);
  const formId = useId();
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [category, setCategory] = useState(product?.categoryId ? String(product.categoryId) : product?.category ? `legacy:${product.category}` : '');
  const [brandId, setBrandId] = useState(product?.brandId ? String(product.brandId) : '');
  const [highlightText, setHighlightText] = useState((product?.highlightSpecs || []).map(item => item.content).join('\n'));
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [originalPrice, setOriginalPrice] = useState(String(product?.originalPrice ?? ''));
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? ''));
  const [stockQuantity, setStockQuantity] = useState(String(product?.stockQuantity ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product?.lowStockThreshold ?? 5));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [imageOrder, setImageOrder] = useState<number[]>((product?.images || []).map(image => image.id));
  const [customSpecifications, setCustomSpecifications] = useState<{ id?: number; name: string; value: string; sortOrder: number }[]>(() => (product?.customSpecifications || []).map(item => ({ id: item.id, name: item.name, value: item.value, sortOrder: item.sortOrder })));
  const [attributes, setAttributes] = useState<CategoryBoundAttribute[]>([]);
  const [attributeInputs, setAttributeInputs] = useState<Record<number, string[]>>({});
  const [attributeLoading, setAttributeLoading] = useState(false);
  const [attributeError, setAttributeError] = useState('');
  const [requiredErrors, setRequiredErrors] = useState<Set<number>>(new Set());
  const [categoryConfirm, setCategoryConfirm] = useState<string | null>(null);

  const [allSections, setAllSections] = useState<ProductSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([]);
  const [sectionSearch, setSectionSearch] = useState('');
  const initialSectionIdsRef = useRef<number[]>([]);
  const sectionTriggerRef = useRef<HTMLButtonElement>(null);
  const sectionDropdownRef = useRef<HTMLDivElement>(null);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory === category) return;
    const hasValues = Object.values(attributeInputs).some(vals => vals.length > 0 && vals.some(v => v !== ''));
    if (hasValues) { setCategoryConfirm(newCategory); return; }
    setCategory(newCategory);
    setAttributeInputs({});
    setRequiredErrors(new Set());
  };

  const inconsistentPricing = originalPrice.trim() !== '' && Number.isFinite(Number(originalPrice)) && Number.isFinite(Number(price)) && Number(originalPrice) < Number(price);
  const validDiscount = !inconsistentPricing && originalPrice.trim() !== '' && price.trim() !== '' && Number(originalPrice) > 0 && Number(price) > 0 && Number(originalPrice) > Number(price);
  const discountPct = validDiscount ? Math.round((1 - Number(price) / Number(originalPrice)) * 100) : 0;
  const discountSaved = validDiscount ? Number(originalPrice) - Number(price) : 0;

  useEffect(() => { if (!slugTouched) setSlug(slugify(name)); }, [name, slugTouched]);
  useEffect(() => {
    if (product?.categoryId || !product?.category) return;
    const existingCategory = categories.find(item => item.name === product.category);
    if (existingCategory) setCategory(String(existingCategory.id));
  }, [categories, product?.category, product?.categoryId]);
  useEffect(() => {
    const categoryId = Number(category);
    if (!token || !Number.isSafeInteger(categoryId) || categoryId <= 0) { setAttributes([]); setAttributeInputs({}); setAttributeError(''); return; }
    const controller = new AbortController();
    setAttributeLoading(true); setAttributeError('');
    getCategoryAttributes(token, categoryId, controller.signal).then(result => {
      setAttributes(result.attributes);
      const existing = new Map((product?.productAttributes || []).map(item => [item.id, item]));
      setAttributeInputs(Object.fromEntries(result.attributes.map(attribute => {
        const saved = existing.get(attribute.id);
        return [attribute.id, saved ? (['SELECT', 'MULTI_SELECT'].includes(attribute.type) ? saved.valueIds.map(String) : [attribute.type === 'BOOLEAN' ? (saved.values[0] === 'Có' ? 'true' : 'false') : (saved.values[0] || '')]) : []];
      })));
    }).catch(reason => { if (!controller.signal.aborted) { setAttributes([]); setAttributeError(reason instanceof Error ? reason.message : 'Không tải được thuộc tính.'); } }).finally(() => { if (!controller.signal.aborted) setAttributeLoading(false); });
    return () => controller.abort();
  }, [category, product?.productAttributes, token]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setSectionsLoading(true);
    getProductSections(token, controller.signal)
      .then(result => {
        setAllSections(result.sections);
        if (product?.id) {
          const initial = result.sections.filter(s => s.products.some(p => p.id === product.id)).map(s => s.id);
          initialSectionIdsRef.current = initial;
          setSelectedSectionIds(initial);
        }
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setSectionsLoading(false); });
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const next = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach(item => URL.revokeObjectURL(item.url));
  }, [files]);

  const openSectionDropdown = () => {
    if (!sectionTriggerRef.current) return;
    const rect = sectionTriggerRef.current.getBoundingClientRect();
    setDropdownStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220), zIndex: 9999 });
    setSectionSearch('');
    setSectionDropdownOpen(true);
  };
  useEffect(() => {
    if (!sectionDropdownOpen) return;
    const onMouse = (e: MouseEvent) => {
      if (sectionTriggerRef.current?.contains(e.target as Node) || sectionDropdownRef.current?.contains(e.target as Node)) return;
      setSectionDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSectionDropdownOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey); };
  }, [sectionDropdownOpen]);
  const sectionTriggerText = selectedSectionIds.length === 0 ? null
    : selectedSectionIds.length === 1 ? (allSections.find(s => s.id === selectedSectionIds[0])?.name ?? '1 khối')
    : `Đã chọn ${selectedSectionIds.length} khối`;
  const filteredSections = allSections.filter(s => !sectionSearch || s.name.toLowerCase().includes(sectionSearch.toLowerCase()));

  const keptImageOrder = imageOrder.filter(id => !removedImageIds.includes(id));
  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name))) { setFileError('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP với MIME đúng.'); return; }
    if (selected.some(file => file.size > 10 * 1024 * 1024)) { setFileError('Ảnh sản phẩm tối đa 10 MB.'); return; }
    if (files.length + selected.length > 10) { setFileError('Mỗi lần lưu chỉ được upload tối đa 10 ảnh mới.'); return; }
    setFileError('');
    setFiles(current => [...current, ...selected]);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // Frontend required-field check
    const missing = new Set<number>();
    for (const attr of attributes) {
      if (!attr.isRequired) continue;
      const vals = attributeInputs[attr.id] || [];
      if (!vals.length || vals.every(v => v === '')) missing.add(attr.id);
    }
    if (missing.size > 0) { setRequiredErrors(missing); return; }
    setRequiredErrors(new Set());
    const body = new FormData();
    const selectedCategory = categories.find(item => String(item.id) === category);
    const legacyCategory = category.startsWith('legacy:') ? category.slice('legacy:'.length) : '';
    const keptImageIds = imageOrder.filter(id => !removedImageIds.includes(id));
    const productAttributes = attributes.map(attribute => ({ attributeId: attribute.id, ...(['SELECT', 'MULTI_SELECT'].includes(attribute.type) ? { attributeValueIds: (attributeInputs[attribute.id] || []).map(Number) } : { valueText: attributeInputs[attribute.id]?.[0] || null }) }));
    Object.entries({ name, slug, category: selectedCategory?.name || legacyCategory || '', categoryId: selectedCategory?.id || '', brandId, description, price, originalPrice, costPrice, stockQuantity, lowStockThreshold, isActive: String(isActive), customSpecifications: JSON.stringify(customSpecifications.filter(spec => spec.name.trim() && spec.value.trim()).map((spec, sortOrder) => ({ name: spec.name.trim(), value: spec.value.trim(), sortOrder: spec.sortOrder ?? sortOrder }))), productAttributes: JSON.stringify(productAttributes), highlightSpecs: JSON.stringify(highlightText.split('\n').map(line => line.trim()).filter(Boolean).map((content, sortOrder) => ({ content, sortOrder }))), keepImageIds: JSON.stringify(keptImageIds), imageOrderIds: JSON.stringify(keptImageIds) }).forEach(([key, value]) => body.append(key, String(value)));
    files.forEach(file => body.append('images', file));
    const initial = initialSectionIdsRef.current;
    const sectionsDiff = {
      add: selectedSectionIds.filter(id => !initial.includes(id)),
      remove: initial.filter(id => !selectedSectionIds.includes(id)),
    };
    onSave(body, sectionsDiff);
  };

  const footer = (
    <div className="flex items-center justify-between gap-3">
      {error ? <p role="alert" className="min-w-0 flex-1 truncate text-xs text-red-600" title={error}>{error}</p> : <span />}
      <div className="flex shrink-0 gap-2">
        <button type="button" form={formId} onClick={onClose} disabled={busy} className="ui-button ui-button--neutral rounded-lg border border-slate-200 px-4 py-2 text-sm">Hủy</button>
        <button type="submit" form={formId} disabled={busy || attributeLoading || Boolean(attributeError)} className="ui-button ui-button--primary rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu sản phẩm'}</button>
      </div>
    </div>
  );

  return (
    <Modal title={product ? `Sửa sản phẩm — ${product.name}` : 'Thêm sản phẩm mới'} onClose={onClose} busy={busy} size="lg" footer={footer}>
      <form id={formId} onSubmit={submit} className="space-y-5">

        {/* A. Thông tin cơ bản */}
        <section>
          <h3 className={sectionHeadCls}>Thông tin cơ bản</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="col-span-full text-sm font-medium">
              Tên sản phẩm *
              <input required value={name} onChange={event => setName(event.target.value)} className={inputCls} />
            </label>
            <label className="text-sm font-medium">
              Slug
              <input required value={slug} onChange={event => { setSlugTouched(true); setSlug(event.target.value); }} className={inputCls} />
            </label>
            <label className="text-sm font-medium">
              Mã SP
              {product?.sku
                ? <input value={product.sku} readOnly className={`${inputCls} cursor-not-allowed bg-slate-50 text-slate-600`} title="Mã SP tự động sinh theo danh mục" />
                : <input value="(tự động khi lưu)" readOnly className={`${inputCls} cursor-not-allowed bg-slate-50 italic text-slate-500`} />}
            </label>
            <label className="text-sm font-medium">
              Danh mục
              <select value={categoryConfirm ?? category} onChange={event => handleCategoryChange(event.target.value)} className={inputCls}>
                <option value="">Chưa phân loại</option>
                {product?.category && !categories.some(item => item.name === product.category) && <option value={`legacy:${product.category}`}>{product.category} (dữ liệu hiện có)</option>}
                {categories.map(item => <option key={item.id} value={String(item.id)}>{item.name}{item.isActive ? '' : ' (đang ẩn)'}</option>)}
              </select>
              {categoryConfirm !== null && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <p className="font-medium text-amber-800">Thay đổi danh mục sẽ xóa các giá trị thuộc tính đã nhập.</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => { setCategory(categoryConfirm); setAttributeInputs({}); setRequiredErrors(new Set()); setCategoryConfirm(null); }} className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700">Xác nhận</button>
                    <button type="button" onClick={() => setCategoryConfirm(null)} className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">Hủy</button>
                  </div>
                </div>
              )}
            </label>
            <label className="text-sm font-medium">
              Thương hiệu
              <select value={brandId} onChange={event => setBrandId(event.target.value)} className={inputCls}>
                <option value="">Chưa chọn thương hiệu</option>
                {brands.map(item => <option key={item.id} value={String(item.id)}>{item.name}{item.isActive ? '' : ' (đang ẩn)'}</option>)}
              </select>
            </label>
            {/* Description + Section picker — 75/25 on sm+ */}
            <div className="col-span-full grid items-start gap-3 sm:grid-cols-[3fr_1fr]">
              <label className="text-sm font-medium">
                Mô tả chi tiết
                <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} className={`${inputCls} resize-y`} />
              </label>
              <div className="text-sm font-medium">
                <span className="flex items-center justify-between">
                  Khối sản phẩm
                  {selectedSectionIds.length > 0 && (
                    <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700">{selectedSectionIds.length}</span>
                  )}
                </span>
                <button
                  ref={sectionTriggerRef}
                  type="button"
                  onClick={openSectionDropdown}
                  aria-haspopup="listbox"
                  aria-expanded={sectionDropdownOpen}
                  className={`${inputCls} flex w-full items-center justify-between gap-1 text-left`}
                >
                  <span className={`truncate ${selectedSectionIds.length ? 'text-slate-800' : 'text-slate-400'}`}>
                    {sectionTriggerText ?? 'Chọn khối sản phẩm'}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${sectionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* B. Giá & Tồn kho */}
        <section>
          <h3 className={sectionHeadCls}>Giá & Tồn kho</h3>

          {/* Hàng 1: Giá */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium">
              Giá gốc (₫)
              <input type="number" min="0" value={originalPrice} onChange={event => setOriginalPrice(event.target.value)} placeholder="Để trống nếu không giảm giá" className={inputCls} />
            </label>
            <label className="text-sm font-medium">
              Giá bán (sau giảm) (₫) *
              <input required type="number" min="0" value={price} onChange={event => setPrice(event.target.value)} className={inputCls} />
            </label>
            <label className="text-sm font-medium text-slate-500">
              Giá nhập (₫) <span className="text-xs font-normal text-slate-400">— nội bộ</span>
              <input type="number" min="0" value={costPrice} onChange={event => setCostPrice(event.target.value)} className={`${inputCls} text-slate-700`} />
            </label>
          </div>

          {/* Trạng thái giảm giá */}
          {validDiscount && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5">
              <span className="rounded-md bg-primary-600 px-1.5 py-0.5 text-xs font-bold text-white">-{discountPct}%</span>
              <span className="text-xs font-medium text-green-800">Tiết kiệm {discountSaved.toLocaleString('vi-VN')}₫</span>
            </div>
          )}
          {inconsistentPricing && (
            <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              Giá gốc thấp hơn giá bán — gian hàng sẽ không hiển thị mức giảm giá.
            </p>
          )}

          {/* Hàng 2: Tồn kho */}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium">Tồn kho *<input required type="number" min="0" value={stockQuantity} onChange={event => setStockQuantity(event.target.value)} className={inputCls} /></label>
            <label className="text-sm font-medium">Ngưỡng sắp hết<input type="number" min="0" value={lowStockThreshold} onChange={event => setLowStockThreshold(event.target.value)} className={inputCls} /></label>
            <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium">
              <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} className="h-4 w-4" />
              Đang bán
            </label>
          </div>
        </section>

        {/* C. Ảnh sản phẩm */}
        <section>
          <h3 className={sectionHeadCls}>Ảnh sản phẩm</h3>
          {fileError && <p role="alert" className="mb-2 text-sm text-red-600">{fileError}</p>}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
            <ImagePlus className="h-4 w-4 shrink-0" />Thêm ảnh JPG, PNG, WEBP
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} className="sr-only" />
          </label>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {keptImageOrder.map((imageId, index) => {
              const image = product?.images?.find(item => item.id === imageId);
              if (!image || removedImageIds.includes(image.id)) return null;
              return (
                <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg border">
                  <img src={mediaUrl(image.imageUrl)} alt={image.altText || product?.name} className="h-full w-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-white/90 px-1 py-0 text-[9px] font-semibold leading-4">{index === 0 ? 'Chính' : index + 1}</span>
                  <div className="absolute right-0.5 top-0.5 flex gap-0.5">
                    <button type="button" disabled={index === 0} onClick={() => setImageOrder(current => { const next = current.filter(id => !removedImageIds.includes(id)); [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="ui-button hidden rounded bg-white/90 px-1 text-xs leading-4 disabled:opacity-30 sm:block" aria-label="Đưa ảnh lên">↑</button>
                    <button type="button" disabled={index === keptImageOrder.length - 1} onClick={() => setImageOrder(current => { const next = current.filter(id => !removedImageIds.includes(id)); [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="ui-button hidden rounded bg-white/90 px-1 text-xs leading-4 disabled:opacity-30 sm:block" aria-label="Đưa ảnh xuống">↓</button>
                    <button type="button" onClick={() => setRemovedImageIds(current => [...current, image.id])} className="ui-button rounded bg-white/90 p-1 text-red-600" aria-label={`Xóa ảnh ${image.id}`}><Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" /></button>
                  </div>
                </div>
              );
            })}
            {previews.map(item => (
              <div key={item.url} className="relative aspect-square overflow-hidden rounded-lg border">
                <img src={item.url} alt="Ảnh mới" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFiles(current => current.filter(file => file !== item.file))} className="ui-button absolute right-0.5 top-0.5 rounded bg-white/90 p-1 text-red-600" aria-label={`Bỏ ảnh ${item.file.name}`}><Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" /></button>
              </div>
            ))}
          </div>
        </section>

        {/* D. Thông số nổi bật */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className={sectionHeadCls + ' mb-0'}>Thông số nổi bật</h3>
            <span className="text-xs text-slate-500">{highlightText.split('\n').map(l => l.trim()).filter(Boolean).length}/12</span>
          </div>
          <textarea value={highlightText} onChange={event => setHighlightText(event.target.value)} rows={4} placeholder={'CPU: Intel Core i5-12400F\nRAM: 16GB DDR4\nSSD: 512GB NVMe\nGPU: RTX 3050 8GB'} title="Mỗi dòng một thông số ngắn — hiển thị trên Product Card và trang chi tiết." className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm leading-relaxed" />
        </section>

        {/* E. Thuộc tính chuẩn */}
        <section>
          <h3 className={sectionHeadCls}>Thuộc tính chuẩn <span className="normal-case font-normal text-slate-400">(bộ lọc & Mega Menu)</span></h3>
          {attributeLoading && <p className="text-sm text-slate-500">Đang tải thuộc tính...</p>}
          {attributeError && <p role="alert" className="text-sm text-red-600">{attributeError}</p>}
          {!attributeLoading && !attributeError && !category && <p className="text-sm text-slate-500">Chọn danh mục để tải thuộc tính phù hợp.</p>}
          {!attributeLoading && !attributeError && category && attributes.length === 0 && <p className="text-sm text-slate-500">Danh mục này chưa được gán thuộc tính.</p>}
          {!attributeLoading && !attributeError && attributes.length > 0 && (() => {
            const displayed = attributes.filter(a => a.showInForm !== false);
            const buildPcAttrs = attributes.filter(a => a.requiredForBuildPC);
            const buildPcFilled = buildPcAttrs.filter(a => { const v = attributeInputs[a.id] || []; return v.length > 0 && v.some(s => s !== ''); }).length;
            return (
              <>
                {displayed.length === 0 && <p className="text-sm text-slate-500">Không có thuộc tính nào được cấu hình hiển thị trong form.</p>}
                {displayed.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {displayed.map(attribute => {
                      const hasErr = requiredErrors.has(attribute.id);
                      const labelCls = `text-sm font-medium${hasErr ? ' text-red-700' : ''}`;
                      const fieldCls = `${inputCls}${hasErr ? ' border-red-400 ring-1 ring-red-300' : ''}`;
                      return (
                        <label key={attribute.id} className={labelCls}>
                          <span>
                            {attribute.name}
                            {attribute.isRequired && <span className="ml-0.5 text-red-500" aria-label="bắt buộc">*</span>}
                            {attribute.unit && <span className="ml-1 text-xs font-normal text-slate-400">({attribute.unit})</span>}
                          </span>
                          {attribute.type === 'SELECT' && <select value={attributeInputs[attribute.id]?.[0] || ''} onChange={event => { setAttributeInputs(c => ({ ...c, [attribute.id]: event.target.value ? [event.target.value] : [] })); if (hasErr) setRequiredErrors(e => { const n = new Set(e); n.delete(attribute.id); return n; }); }} className={fieldCls}><option value="">Chưa chọn</option>{attribute.values.map(v => <option key={v.id} value={v.id}>{v.value}</option>)}</select>}
                          {attribute.type === 'MULTI_SELECT' && <select multiple value={attributeInputs[attribute.id] || []} onChange={event => { setAttributeInputs(c => ({ ...c, [attribute.id]: Array.from(event.target.selectedOptions, o => o.value) })); if (hasErr) setRequiredErrors(e => { const n = new Set(e); n.delete(attribute.id); return n; }); }} className={`${fieldCls} min-h-24`}>{attribute.values.map(v => <option key={v.id} value={v.id}>{v.value}</option>)}</select>}
                          {attribute.type === 'TEXT' && <input value={attributeInputs[attribute.id]?.[0] || ''} placeholder={attribute.unit || undefined} onChange={event => { setAttributeInputs(c => ({ ...c, [attribute.id]: [event.target.value] })); if (hasErr) setRequiredErrors(e => { const n = new Set(e); n.delete(attribute.id); return n; }); }} className={fieldCls} />}
                          {attribute.type === 'NUMBER' && <input type="number" value={attributeInputs[attribute.id]?.[0] || ''} placeholder={attribute.unit || undefined} onChange={event => { setAttributeInputs(c => ({ ...c, [attribute.id]: [event.target.value] })); if (hasErr) setRequiredErrors(e => { const n = new Set(e); n.delete(attribute.id); return n; }); }} className={fieldCls} />}
                          {attribute.type === 'BOOLEAN' && <select value={attributeInputs[attribute.id]?.[0] || ''} onChange={event => { setAttributeInputs(c => ({ ...c, [attribute.id]: event.target.value ? [event.target.value] : [] })); if (hasErr) setRequiredErrors(e => { const n = new Set(e); n.delete(attribute.id); return n; }); }} className={fieldCls}><option value="">Chưa chọn</option><option value="true">Có</option><option value="false">Không</option></select>}
                          {hasErr && <p role="alert" className="mt-0.5 text-xs font-normal text-red-600">Trường này là bắt buộc.</p>}
                        </label>
                      );
                    })}
                  </div>
                )}
                {buildPcAttrs.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs">
                    <span className="font-semibold text-blue-700">Build PC:</span>
                    <span className={`font-semibold ${buildPcFilled === buildPcAttrs.length ? 'text-green-700' : 'text-blue-600'}`}>{buildPcFilled}/{buildPcAttrs.length} thông số</span>
                    <span className="text-blue-500">{buildPcFilled === buildPcAttrs.length ? '— đủ điều kiện gợi ý linh kiện' : '— cần thêm để gợi ý linh kiện'}</span>
                  </div>
                )}
              </>
            );
          })()}
        </section>

        {/* G. Thông số tự do */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className={sectionHeadCls + ' mb-0'}>Thông số tự do <span className="normal-case font-normal text-slate-400">(chỉ hiển thị)</span></h3>
            </div>
            <button type="button" disabled={busy} onClick={() => setCustomSpecifications(current => [...current, { name: '', value: '', sortOrder: current.length }])} className="ui-button inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-semibold text-white"><Plus className="h-3 w-3" />Thêm</button>
          </div>
          {customSpecifications.length === 0
            ? <p className="text-xs text-slate-500">Chưa có thông số tự do.</p>
            : <ul className="space-y-2">
              {customSpecifications.map((spec, index) => (
                <li key={index} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                  <input aria-label="Tên thông số" placeholder="Tên" value={spec.name} onChange={event => setCustomSpecifications(current => current.map((item, idx) => idx === index ? { ...item, name: event.target.value } : item))} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm" />
                  <input aria-label="Giá trị" placeholder="Giá trị" value={spec.value} onChange={event => setCustomSpecifications(current => current.map((item, idx) => idx === index ? { ...item, value: event.target.value } : item))} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm" />
                  <div className="flex items-center gap-1">
                    <input aria-label="Thứ tự" type="number" min={0} value={spec.sortOrder} onChange={event => setCustomSpecifications(current => current.map((item, idx) => idx === index ? { ...item, sortOrder: Number(event.target.value) } : item))} className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm" />
                    <button type="button" disabled={busy || index === 0} onClick={() => setCustomSpecifications(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next.map((item, idx) => ({ ...item, sortOrder: idx })); })} className="ui-button rounded border border-slate-200 bg-white px-1.5 py-1 text-xs disabled:opacity-30" aria-label="Lên">↑</button>
                    <button type="button" disabled={busy || index === customSpecifications.length - 1} onClick={() => setCustomSpecifications(current => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next.map((item, idx) => ({ ...item, sortOrder: idx })); })} className="ui-button rounded border border-slate-200 bg-white px-1.5 py-1 text-xs disabled:opacity-30" aria-label="Xuống">↓</button>
                    <button type="button" disabled={busy} onClick={() => setCustomSpecifications(current => current.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, sortOrder: idx })))} className="ui-button rounded border border-red-200 bg-white p-1.5 text-red-600" aria-label="Xóa"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </li>
              ))}
            </ul>}
        </section>

      </form>

      {/* Section dropdown portal — rendered at document.body to escape modal overflow */}
      {sectionDropdownOpen && typeof document !== 'undefined' && createPortal(
        <div ref={sectionDropdownRef} style={dropdownStyle} className="rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* search */}
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                autoFocus
                value={sectionSearch}
                onChange={e => setSectionSearch(e.target.value)}
                placeholder="Tìm khối..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm placeholder-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* list */}
          <ul role="listbox" aria-multiselectable="true" className="max-h-52 overflow-y-auto px-1 pb-1">
            {sectionsLoading && <li className="px-3 py-2 text-xs text-slate-500">Đang tải...</li>}
            {!sectionsLoading && allSections.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">Chưa có khối sản phẩm nào.</li>
            )}
            {!sectionsLoading && allSections.length > 0 && filteredSections.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">Không tìm thấy khối phù hợp.</li>
            )}
            {filteredSections.map(section => {
              const checked = selectedSectionIds.includes(section.id);
              return (
                <li key={section.id} role="option" aria-selected={checked}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-slate-300 accent-primary-600"
                      checked={checked}
                      onChange={e => setSelectedSectionIds(prev => e.target.checked ? [...prev, section.id] : prev.filter(id => id !== section.id))}
                    />
                    <span className="flex-1 leading-snug text-slate-700">{section.name}</span>
                    {!section.isActive && <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-400">đang ẩn</span>}
                  </label>
                </li>
              );
            })}
          </ul>

          {/* footer */}
          <div className="border-t border-slate-100 px-3 py-2">
            <a href="/admin/product-sections" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
              <LayoutGrid className="h-3 w-3" />Quản lý khối sản phẩm ↗
            </a>
          </div>
        </div>,
        document.body,
      )}
    </Modal>
  );
}
