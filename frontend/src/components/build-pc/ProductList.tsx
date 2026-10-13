'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect } from 'react';
import { useBuildProducts } from '@/hooks/useBuildProducts';
import ProductItem from './ProductItem';
import Pagination from './Pagination';
import type { BuildPcProduct, BuildPcFacets, BuildPcFilters } from '@/types/buildPc.type';

type Props = {
  slotSlug: string;
  filters: BuildPcFilters;
  selectedProductId: number | undefined;
  onFiltersChange: (filters: BuildPcFilters) => void;
  onSelect: (product: BuildPcProduct) => void;
  onOpenSidebar: () => void;
  onFacetsUpdate?: (facets: BuildPcFacets) => void;
  inStockOnly: boolean;
};

const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name_asc', label: 'Tên A–Z' },
] as const;

export default function ProductList({
  slotSlug,
  filters,
  selectedProductId,
  onFiltersChange,
  onSelect,
  onOpenSidebar,
  onFacetsUpdate,
  inStockOnly,
}: Props) {
  const { products, meta, facets, loading, error } = useBuildProducts(slotSlug, filters);

  useEffect(() => {
    if (facets && onFacetsUpdate) onFacetsUpdate(facets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facets]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Tìm kiếm sản phẩm..."
            value={filters.q}
            onChange={e => onFiltersChange({ ...filters, q: e.target.value, page: 1 })}
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-[#C4480A] focus:outline-none focus:ring-1 focus:ring-[#C4480A]/30"
          />
        </div>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={e => onFiltersChange({ ...filters, sort: e.target.value as BuildPcFilters['sort'], page: 1 })}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-[#C4480A] focus:outline-none"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Filter toggle (mobile) */}
        <button
          onClick={onOpenSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 lg:hidden"
          aria-label="Mở bộ lọc"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Results count + stock notice */}
      <div className="flex shrink-0 items-center gap-2 px-4 py-1.5">
        {meta && (
          <span className="text-xs text-slate-500">
            {meta.total.toLocaleString('vi-VN')} sản phẩm
          </span>
        )}
        {inStockOnly && (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Chỉ hiển thị còn hàng</span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {loading && (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex h-32 items-center justify-center text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-sm text-slate-500">
            <span>Không tìm thấy sản phẩm phù hợp.</span>
            <button
              onClick={() => onFiltersChange({ ...filters, q: '', brandId: undefined, minPrice: undefined, maxPrice: undefined, attrFilters: {}, page: 1 })}
              className="text-xs text-[#C4480A] hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="space-y-2 py-2">
            {products.map(p => (
              <ProductItem
                key={p.id}
                product={p}
                isSelected={p.id === selectedProductId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="shrink-0 border-t border-slate-200 px-4">
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={page => onFiltersChange({ ...filters, page })}
          />
        </div>
      )}
    </div>
  );
}
