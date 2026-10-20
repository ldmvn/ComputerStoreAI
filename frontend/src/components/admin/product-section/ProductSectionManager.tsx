'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronRight,
  Edit3, Eye, EyeOff, Filter, LayoutGrid, PackageOpen, Plus, ShoppingBag, Trash2, X,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { adminActionButtonClass, adminActionGroupClass } from '@/components/admin/adminActionStyles';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/auth.store';
import type { ProductSection, ProductSectionInput, QuickFilterConfig, QuickFilterTab, SectionProduct } from '@/types/productSection.type';
import { mediaUrl } from '@/services/http.client';
import {
  addProductsToSection,
  createProductSection,
  deleteProductSection,
  getProductSections,
  removeProductFromSection,
  reorderProductSections,
  reorderSectionProducts,
  saveQuickFilterConfig,
  setProductSectionStatus,
  updateProductSection,
} from '@/services/productSection.service';
import { getAdminBrands, type Brand } from '@/services/brand.service';
import { getAdminCategories, type Category } from '@/services/category.service';
import { getAttributes, type Attribute } from '@/services/attribute.service';
import ProductPicker from './ProductPicker';
import ProductSectionForm from './ProductSectionForm';

const btn = adminActionButtonClass;

const FILTER_TYPE_OPTIONS = [
  { value: 'BRAND', label: 'Thương hiệu' },
  { value: 'CATEGORY', label: 'Danh mục' },
  { value: 'ATTRIBUTE', label: 'Thuộc tính' },
] as const;

const FILTER_TYPE_LABEL: Record<string, string> = { ALL: 'Tất cả', BRAND: 'Thương hiệu', CATEGORY: 'Danh mục', ATTRIBUTE: 'Thuộc tính' };

type TabDraft = {
  id: string;
  label: string;
  labelAutoSet: boolean;
  filterType: 'BRAND' | 'CATEGORY' | 'ATTRIBUTE';
  selectedBrandId: number | '';
  selectedCategoryId: number | '';
  selectedAttributeId: number | '';
  selectedAttributeValueId: number | '';
};

function newDraft(): TabDraft {
  return { id: crypto.randomUUID(), label: '', labelAutoSet: false, filterType: 'BRAND', selectedBrandId: '', selectedCategoryId: '', selectedAttributeId: '', selectedAttributeValueId: '' };
}

function draftToTab(d: TabDraft, sortOrder: number, brands: Brand[], categories: Category[], attributes: Attribute[]): QuickFilterTab {
  const base = { id: d.id, label: d.label, sortOrder };
  if (d.filterType === 'BRAND' && d.selectedBrandId !== '') {
    const brand = brands.find(b => b.id === d.selectedBrandId);
    return { ...base, filterType: 'BRAND', brandId: d.selectedBrandId, brandSlug: brand?.slug ?? null };
  }
  if (d.filterType === 'CATEGORY' && d.selectedCategoryId !== '') {
    const cat = categories.find(c => c.id === d.selectedCategoryId);
    return { ...base, filterType: 'CATEGORY', categoryId: d.selectedCategoryId, categorySlug: cat?.slug ?? null };
  }
  if (d.filterType === 'ATTRIBUTE' && d.selectedAttributeId !== '' && d.selectedAttributeValueId !== '') {
    const attr = attributes.find(a => a.id === d.selectedAttributeId);
    return { ...base, filterType: 'ATTRIBUTE', attributeValueId: d.selectedAttributeValueId, attributeId: d.selectedAttributeId, attributeSlug: attr?.slug ?? null };
  }
  return { ...base, filterType: d.filterType };
}

function tabToDraft(t: QuickFilterTab): TabDraft {
  const filterType = (t.filterType === 'ALL' ? 'BRAND' : t.filterType) as 'BRAND' | 'CATEGORY' | 'ATTRIBUTE';
  return {
    id: t.id,
    label: t.label,
    labelAutoSet: false,
    filterType,
    selectedBrandId: t.brandId ?? '',
    selectedCategoryId: t.categoryId ?? '',
    selectedAttributeId: t.attributeId ?? '',
    selectedAttributeValueId: t.attributeValueId ?? '',
  };
}

function validateDraft(d: TabDraft, existingTabs: TabDraft[], editingIdx: number | null): string | null {
  if (!d.label.trim()) return 'Tên tab không được để trống.';
  if (d.label.trim().length > 50) return 'Tên tab tối đa 50 ký tự.';
  if (d.filterType === 'BRAND' && d.selectedBrandId === '') return 'Vui lòng chọn thương hiệu.';
  if (d.filterType === 'CATEGORY' && d.selectedCategoryId === '') return 'Vui lòng chọn danh mục.';
  if (d.filterType === 'ATTRIBUTE' && d.selectedAttributeId === '') return 'Vui lòng chọn thuộc tính.';
  if (d.filterType === 'ATTRIBUTE' && d.selectedAttributeValueId === '') return 'Vui lòng chọn giá trị thuộc tính.';
  // duplicate check
  const isDuplicate = existingTabs.some((t, i) => {
    if (i === editingIdx) return false;
    if (t.filterType !== d.filterType) return false;
    if (d.filterType === 'BRAND') return t.selectedBrandId === d.selectedBrandId;
    if (d.filterType === 'CATEGORY') return t.selectedCategoryId === d.selectedCategoryId;
    if (d.filterType === 'ATTRIBUTE') return t.selectedAttributeValueId === d.selectedAttributeValueId;
    return false;
  });
  if (isDuplicate) return 'Tab với bộ lọc này đã tồn tại trong khối.';
  return null;
}

const selectCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:bg-slate-50 disabled:text-slate-400';

function TabForm({
  draft, editingIdx, tabs,
  brands, categories, attributes,
  dataLoading, dataError,
  onChange, onCommit, onCancel,
}: {
  draft: TabDraft; editingIdx: number | null; tabs: TabDraft[];
  brands: Brand[]; categories: Category[]; attributes: Attribute[];
  dataLoading: boolean; dataError: string;
  onChange: (d: TabDraft) => void; onCommit: () => void; onCancel: () => void;
}) {
  const [error, setError] = useState('');

  const handleFilterTypeChange = (ft: TabDraft['filterType']) => {
    onChange({ ...draft, filterType: ft, selectedBrandId: '', selectedCategoryId: '', selectedAttributeId: '', selectedAttributeValueId: '', label: draft.labelAutoSet ? '' : draft.label, labelAutoSet: draft.labelAutoSet ? false : draft.labelAutoSet });
    setError('');
  };

  const handleBrandChange = (brandId: number | '') => {
    const brand = brands.find(b => b.id === brandId);
    const newLabel = (draft.labelAutoSet || !draft.label) && brand ? brand.name : draft.label;
    onChange({ ...draft, selectedBrandId: brandId, label: newLabel, labelAutoSet: !!(brand && (draft.labelAutoSet || !draft.label)) });
    setError('');
  };

  const handleCategoryChange = (catId: number | '') => {
    const cat = categories.find(c => c.id === catId);
    const newLabel = (draft.labelAutoSet || !draft.label) && cat ? cat.name : draft.label;
    onChange({ ...draft, selectedCategoryId: catId, label: newLabel, labelAutoSet: !!(cat && (draft.labelAutoSet || !draft.label)) });
    setError('');
  };

  const handleAttributeChange = (attrId: number | '') => {
    const newLabel = draft.labelAutoSet ? '' : draft.label;
    onChange({ ...draft, selectedAttributeId: attrId, selectedAttributeValueId: '', label: newLabel, labelAutoSet: false });
    setError('');
  };

  const handleValueChange = (valId: number | '') => {
    const attr = attributes.find(a => a.id === draft.selectedAttributeId);
    const val = attr?.values.find(v => v.id === valId);
    const newLabel = (draft.labelAutoSet || !draft.label) && val ? val.value : draft.label;
    onChange({ ...draft, selectedAttributeValueId: valId, label: newLabel, labelAutoSet: !!(val && (draft.labelAutoSet || !draft.label)) });
    setError('');
  };

  const handleLabelChange = (label: string) => onChange({ ...draft, label, labelAutoSet: false });

  const commit = () => {
    const err = validateDraft(draft, tabs, editingIdx);
    if (err) { setError(err); return; }
    setError('');
    onCommit();
  };

  const selectedAttr = attributes.find(a => a.id === draft.selectedAttributeId);
  const attrValues = selectedAttr?.values.filter(v => v.isActive) ?? [];

  // Category display with parent prefix
  const catById = Object.fromEntries(categories.map(c => [c.id, c]));
  const catLabel = (c: Category) => c.parentId && catById[c.parentId] ? `${catById[c.parentId].name} › ${c.name}` : c.name;

  return (
    <div className="mt-3 rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary-700">{editingIdx !== null ? 'Sửa tab' : 'Tab mới'}</p>

      {dataError && <p className="text-xs text-red-600">{dataError}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Filter type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Loại bộ lọc *</label>
          <select
            value={draft.filterType}
            onChange={e => handleFilterTypeChange(e.target.value as TabDraft['filterType'])}
            className={selectCls}
            disabled={dataLoading}
          >
            {FILTER_TYPE_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Brand selector */}
        {draft.filterType === 'BRAND' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Thương hiệu *</label>
            <select
              value={draft.selectedBrandId}
              onChange={e => handleBrandChange(e.target.value ? Number(e.target.value) : '')}
              className={selectCls}
              disabled={dataLoading || !!dataError}
            >
              <option value="">{dataLoading ? 'Đang tải...' : '— Chọn thương hiệu —'}</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Category selector */}
        {draft.filterType === 'CATEGORY' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Danh mục *</label>
            <select
              value={draft.selectedCategoryId}
              onChange={e => handleCategoryChange(e.target.value ? Number(e.target.value) : '')}
              className={selectCls}
              disabled={dataLoading || !!dataError}
            >
              <option value="">{dataLoading ? 'Đang tải...' : '— Chọn danh mục —'}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{catLabel(c)}</option>)}
            </select>
          </div>
        )}

        {/* Attribute selector */}
        {draft.filterType === 'ATTRIBUTE' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Thuộc tính *</label>
            <select
              value={draft.selectedAttributeId}
              onChange={e => handleAttributeChange(e.target.value ? Number(e.target.value) : '')}
              className={selectCls}
              disabled={dataLoading || !!dataError}
            >
              <option value="">{dataLoading ? 'Đang tải...' : '— Chọn thuộc tính —'}</option>
              {attributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Attribute value selector — full width below */}
      {draft.filterType === 'ATTRIBUTE' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Giá trị *</label>
          <select
            value={draft.selectedAttributeValueId}
            onChange={e => handleValueChange(e.target.value ? Number(e.target.value) : '')}
            className={selectCls}
            disabled={!draft.selectedAttributeId || dataLoading}
          >
            <option value="">
              {!draft.selectedAttributeId ? 'Chọn thuộc tính trước' : attrValues.length === 0 ? 'Không có giá trị nào' : '— Chọn giá trị —'}
            </option>
            {attrValues.map(v => <option key={v.id} value={v.id}>{v.value}</option>)}
          </select>
        </div>
      )}

      {/* Label */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Tên hiển thị trên tab *
          {draft.labelAutoSet && <span className="ml-1.5 text-[10px] font-normal text-slate-400">(tự điền — bạn có thể sửa)</span>}
        </label>
        <input
          type="text"
          maxLength={50}
          value={draft.label}
          onChange={e => handleLabelChange(e.target.value)}
          placeholder="Ví dụ: ASUS, Core i5, DDR5..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-200"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button type="button" onClick={commit} disabled={dataLoading} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-primary-700">
          {editingIdx !== null ? 'Lưu thay đổi' : 'Thêm tab'}
        </button>
      </div>
    </div>
  );
}

function QuickFilterEditor({
  section, token, busy, onClose, onSaved,
}: {
  section: ProductSection; token: string | null; busy: boolean;
  onClose: () => void; onSaved: (section: ProductSection) => void;
}) {
  const cfg = section.quickFilterConfig;
  const [enabled, setEnabled] = useState(cfg?.enabled ?? true);
  const [tabs, setTabs] = useState<TabDraft[]>(() =>
    cfg?.tabs?.filter(t => t.filterType !== 'ALL').map(tabToDraft) ?? []
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<TabDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Reference data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      getAdminBrands(token, ac.signal),
      getAdminCategories(token, ac.signal),
      getAttributes(token, ac.signal),
    ]).then(([b, c, a]) => {
      if (ac.signal.aborted) return;
      setBrands(b.brands.filter(x => x.isActive));
      setCategories(c.categories.filter(x => x.isActive));
      setAttributes(a.attributes.filter(x => x.isActive && (x.type === 'SELECT' || x.type === 'MULTI_SELECT')));
      setDataLoading(false);
    }).catch(e => {
      if (ac.signal.aborted) return;
      setDataError(e instanceof Error ? e.message : 'Không tải được dữ liệu. Vui lòng thử lại.');
      setDataLoading(false);
    });
    return () => ac.abort();
  }, [token]);

  const openAdd = () => { setDraft(newDraft()); setEditingIdx(null); };
  const openEdit = (idx: number) => { setDraft({ ...tabs[idx] }); setEditingIdx(idx); };
  const cancelDraft = () => { setDraft(null); setEditingIdx(null); };

  const commitDraft = () => {
    if (!draft) return;
    setTabs(prev => {
      const next = [...prev];
      if (editingIdx !== null) next[editingIdx] = draft;
      else next.push(draft);
      return next;
    });
    cancelDraft();
  };

  const removeTab = (idx: number) => {
    setTabs(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) cancelDraft();
    else if (editingIdx !== null && idx < editingIdx) setEditingIdx(editingIdx - 1);
  };

  const tabDisplayText = (t: TabDraft) => {
    if (t.filterType === 'BRAND') { const b = brands.find(x => x.id === t.selectedBrandId); return b ? `Thương hiệu: ${b.name}` : 'Thương hiệu'; }
    if (t.filterType === 'CATEGORY') { const c = categories.find(x => x.id === t.selectedCategoryId); return c ? `Danh mục: ${c.name}` : 'Danh mục'; }
    if (t.filterType === 'ATTRIBUTE') {
      const attr = attributes.find(x => x.id === t.selectedAttributeId);
      const val = attr?.values.find(v => v.id === t.selectedAttributeValueId);
      return attr && val ? `${attr.name}: ${val.value}` : 'Thuộc tính';
    }
    return FILTER_TYPE_LABEL[t.filterType] ?? t.filterType;
  };

  const save = async () => {
    setSaving(true); setSaveError('');
    try {
      const config: QuickFilterConfig | null = tabs.length === 0 ? null : {
        enabled,
        tabs: tabs.map((d, i) => draftToTab(d, i, brands, categories, attributes)),
      };
      const result = await saveQuickFilterConfig(token, section.id, config);
      onSaved(result.section);
      onClose();
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Quick Filter — ${section.name}`} onClose={onClose} busy={saving || busy}>
      <div className="space-y-4">
        {/* enable toggle */}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-slate-700">Hiển thị tab bộ lọc cho khối này</span>
        </label>

        {/* tab list */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">CÁC TAB ({tabs.length}/20)</span>
            {tabs.length < 20 && !draft && (
              <button
                type="button"
                onClick={openAdd}
                disabled={dataLoading}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />Thêm tab
              </button>
            )}
          </div>

          {dataLoading && (
            <p className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">Đang tải dữ liệu thương hiệu, danh mục, thuộc tính...</p>
          )}

          {tabs.length === 0 && !dataLoading ? (
            <p className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-sm text-slate-400">Chưa có tab nào — nhấn &ldquo;Thêm tab&rdquo; để bắt đầu.</p>
          ) : (
            <div className="space-y-1.5">
              {tabs.map((tab, idx) => (
                <div key={tab.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${editingIdx === idx ? 'border-primary-200 bg-primary-50' : 'border-slate-100 bg-slate-50'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{tab.label || '(chưa đặt tên)'}</span>
                    <span className="block truncate text-[11px] text-slate-400">{tabDisplayText(tab)}</span>
                  </span>
                  <button type="button" onClick={() => openEdit(idx)} className={`${btn} shrink-0`} aria-label="Sửa tab" disabled={!!draft && editingIdx !== idx}><Edit3 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => removeTab(idx)} className={`${btn} shrink-0 text-red-600 hover:border-red-200 hover:bg-red-50`} aria-label="Xóa tab"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {draft && (
            <TabForm
              draft={draft}
              editingIdx={editingIdx}
              tabs={tabs}
              brands={brands}
              categories={categories}
              attributes={attributes}
              dataLoading={dataLoading}
              dataError={dataError}
              onChange={setDraft}
              onCommit={commitDraft}
              onCancel={cancelDraft}
            />
          )}
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
          <button type="button" onClick={() => void save()} disabled={saving || !!draft} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-primary-700">
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function sectionVisibility(section: ProductSection) {
  if (!section.isActive) return { label: 'Đang ẩn', cls: 'text-slate-400' };
  if (!section.products.length) return { label: 'Chưa có sản phẩm — không hiển thị', cls: 'text-amber-600' };
  return { label: 'Đang hiển thị trên trang chủ', cls: 'text-green-600' };
}

function ProductRow({
  product, index, total, busy,
  onMoveTo, onRemove,
}: {
  product: SectionProduct; index: number; total: number; busy: boolean;
  onMoveTo: (toIndex: number) => void; onRemove: () => void;
}) {
  const outOfStock = typeof product.stockQuantity === 'number' && product.stockQuantity === 0;
  const hidden = product.isActive === false;

  const [inputVal, setInputVal] = useState(String(index + 1));
  const [inputError, setInputError] = useState('');
  const committedRef = useRef(false);

  useEffect(() => {
    setInputVal(String(index + 1));
    setInputError('');
  }, [index]);

  const commit = () => {
    const raw = inputVal.trim();
    const num = Number(raw);
    if (!raw || !Number.isInteger(num) || num < 1 || num > total) {
      setInputError(`1–${total}`);
      setInputVal(String(index + 1));
      return;
    }
    const toIndex = num - 1;
    if (toIndex === index) { setInputError(''); return; }
    setInputError('');
    committedRef.current = true;
    onMoveTo(toIndex);
  };

  const cancel = () => {
    setInputVal(String(index + 1));
    setInputError('');
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      {/* position input */}
      <div className="relative shrink-0">
        <input
          type="number"
          min={1}
          max={total}
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setInputError(''); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          onBlur={() => { if (!committedRef.current) cancel(); committedRef.current = false; }}
          disabled={busy}
          aria-label={`Vị trí của ${product.name}`}
          title="Nhập số vị trí rồi nhấn Enter để di chuyển"
          className={`w-10 rounded-md border py-1 text-center text-xs font-semibold tabular-nums focus:outline-none focus:ring-1 disabled:opacity-50 ${
            inputError
              ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-red-200'
              : 'border-slate-200 text-slate-500 focus:border-primary-400 focus:ring-primary-200'
          }`}
        />
        {inputError && (
          <div className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white shadow">
            {inputError}
          </div>
        )}
      </div>

      {/* thumbnail */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
        {product.primaryImage ? (
          <img src={mediaUrl(product.primaryImage)} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-slate-300" />
        )}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {product.sku && <span className="font-mono text-[11px] text-slate-400">{product.sku}</span>}
          {hidden && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Đang ẩn</span>}
          {outOfStock && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">Hết hàng</span>}
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" disabled={busy} onClick={onRemove} className={`${btn} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`} aria-label={`Gỡ ${product.name} khỏi khối`}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export default function ProductSectionManager() {
  const token = useAuthStore(state => state.token);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editor, setEditor] = useState<ProductSection | null | undefined>(undefined);
  const [pickerSectionId, setPickerSectionId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ProductSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [quickFilterSectionId, setQuickFilterSectionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await getProductSections(token);
      setSections(result.sections);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được khối sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const action = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); setMessage(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Thao tác không thành công.'); }
    finally { setBusy(false); }
  };

  const save = (input: ProductSectionInput) => void action(async () => {
    if (editor) await updateProductSection(token!, editor.id, input);
    else await createProductSection(token!, input);
    setEditor(undefined);
  }, editor ? 'Đã cập nhật khối sản phẩm.' : 'Đã tạo khối sản phẩm.');

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const moveSection = (section: ProductSection, direction: -1 | 1) => {
    const idx = sections.findIndex(s => s.id === section.id);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= sections.length) return;
    const ids = sections.map(s => s.id);
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    void action(() => reorderProductSections(token!, ids), 'Đã lưu thứ tự khối.');
  };

  const moveProductToPosition = (section: ProductSection, productId: number, toIndex: number) => {
    const ids = section.products.map(p => p.id);
    const fromIndex = ids.indexOf(productId);
    if (fromIndex < 0 || toIndex < 0 || toIndex >= ids.length || fromIndex === toIndex) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, productId);
    void action(() => reorderSectionProducts(token!, section.id, ids), 'Đã lưu thứ tự sản phẩm.');
  };

  const pickerSection = pickerSectionId != null ? sections.find(s => s.id === pickerSectionId) ?? null : null;

  return (
    <section>
      <AdminPageHeader
        title="Khối sản phẩm"
        action={
          <button type="button" onClick={() => setEditor(null)} className="ui-button ui-button--primary inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
            <Plus className="h-4 w-4" />Tạo khối sản phẩm
          </button>
        }
      />
      <AdminFeedback message={message} error={error} />

      {loading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải khối sản phẩm...
        </div>
      ) : !sections.length ? (
        <EmptyState
          icon={LayoutGrid}
          title="Chưa có khối sản phẩm."
          description="Khối sản phẩm là các nhóm hiển thị trên trang chủ."
          action={
            <button type="button" onClick={() => setEditor(null)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              Tạo khối sản phẩm
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const isOpen = expanded.has(section.id);
            const vis = sectionVisibility(section);
            return (
              <article key={section.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
                {/* ── Section header ── */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  {/* expand toggle + info */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(section.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? 'Thu gọn khối' : 'Mở rộng khối'}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="truncate font-semibold text-slate-800">{section.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {section.products.length}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${section.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {section.isActive ? 'Active' : 'Ẩn'}
                    </span>
                    <span className={`hidden truncate text-xs sm:block ${vis.cls}`}>{vis.label}</span>
                  </button>

                  {/* action buttons */}
                  <div className={adminActionGroupClass}>
                    <button type="button" className={btn} onClick={() => setEditor(section)} aria-label="Sửa khối">
                      <Edit3 className="h-3.5 w-3.5" />Sửa
                    </button>
                    <button type="button" className={btn} onClick={() => setQuickFilterSectionId(section.id)} aria-label="Cấu hình Quick Filter">
                      <Filter className="h-3.5 w-3.5" />Filter
                    </button>
                    <button type="button" className={btn} disabled={busy} onClick={() => void action(() => setProductSectionStatus(token!, section.id, !section.isActive), section.isActive ? 'Đã tắt khối.' : 'Đã bật khối.')}>
                      {section.isActive ? <><EyeOff className="h-3.5 w-3.5" />Tắt</> : <><Eye className="h-3.5 w-3.5" />Bật</>}
                    </button>
                    <button type="button" className={`${btn} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`} disabled={busy} onClick={() => setDeleting(section)} aria-label="Xóa khối">
                      <Trash2 className="h-3.5 w-3.5" />Xóa
                    </button>
                    <button type="button" className={btn} disabled={busy || index === 0} onClick={() => moveSection(section, -1)} aria-label="Đưa khối lên">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className={btn} disabled={busy || index === sections.length - 1} onClick={() => moveSection(section, 1)} aria-label="Đưa khối xuống">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Expanded product list ── */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {section.products.length
                          ? `${section.products.length} sản phẩm trong khối`
                          : 'Khối chưa có sản phẩm — sẽ không hiển thị trên trang chủ.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPickerSectionId(section.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                      >
                        <Plus className="h-3.5 w-3.5" />Thêm sản phẩm
                      </button>
                    </div>

                    {!section.products.length ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-6 text-sm text-slate-400">
                        <PackageOpen className="h-5 w-5" />
                        <span>Chưa có sản phẩm</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {section.products.map((product, pIdx) => (
                          <ProductRow
                            key={product.id}
                            product={product}
                            index={pIdx}
                            total={section.products.length}
                            busy={busy}
                            onMoveTo={toIndex => moveProductToPosition(section, product.id, toIndex)}
                            onRemove={() => void action(
                              () => removeProductFromSection(token!, section.id, product.id),
                              'Đã gỡ sản phẩm khỏi khối.',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editor !== undefined && (
        <ProductSectionForm section={editor || undefined} busy={busy} onClose={() => setEditor(undefined)} onSave={save} />
      )}

      {pickerSection && (
        <ProductPicker
          token={token}
          existingIds={pickerSection.products.map(p => p.id)}
          busy={busy}
          onClose={() => setPickerSectionId(null)}
          onAdd={ids => void action(async () => {
            await addProductsToSection(token!, pickerSection.id, ids);
            setPickerSectionId(null);
          }, 'Đã thêm sản phẩm vào khối.')}
        />
      )}

      {quickFilterSectionId != null && (() => {
        const qfSection = sections.find(s => s.id === quickFilterSectionId);
        return qfSection ? (
          <QuickFilterEditor
            section={qfSection}
            token={token}
            busy={busy}
            onClose={() => setQuickFilterSectionId(null)}
            onSaved={updated => setSections(prev => prev.map(s => s.id === updated.id ? updated : s))}
          />
        ) : null;
      })()}

      {deleting && (
        <Modal title="Xóa khối sản phẩm" onClose={() => setDeleting(null)} busy={busy}>
          <p className="text-slate-600">
            Xóa khối <strong>&ldquo;{deleting.name}&rdquo;</strong>? Các sản phẩm trong khối sẽ không bị xóa khỏi cơ sở dữ liệu.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleting(null)} disabled={busy} className="ui-button ui-button--neutral rounded-lg border border-slate-200 px-4 py-2.5 text-sm">Hủy</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void action(async () => { await deleteProductSection(token!, deleting.id); setDeleting(null); }, 'Đã xóa khối sản phẩm.')}
              className="ui-button ui-button--danger rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Đang xóa...' : 'Xóa khối'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
