'use client';

import { X } from 'lucide-react';
import type { BuildPcFacets, BuildPcFilters } from '@/types/buildPc.type';
import { formatProductPrice } from '@/lib/product';

type Props = {
  facets: BuildPcFacets | null;
  filters: BuildPcFilters;
  onChange: (filters: BuildPcFilters) => void;
  onClose?: () => void;
};

type PriceRange = { label: string; min?: number; max?: number };

const PRICE_RANGES: PriceRange[] = [
  { label: 'Dưới 1 triệu', max: 1_000_000 },
  { label: '1 – 2 triệu', min: 1_000_000, max: 2_000_000 },
  { label: '2 – 5 triệu', min: 2_000_000, max: 5_000_000 },
  { label: '5 – 10 triệu', min: 5_000_000, max: 10_000_000 },
  { label: '10 – 20 triệu', min: 10_000_000, max: 20_000_000 },
  { label: 'Trên 20 triệu', min: 20_000_000 },
];

function rangeKey(r: PriceRange) {
  return `${r.min ?? ''}-${r.max ?? ''}`;
}

function activeRangeKey(filters: BuildPcFilters) {
  if (filters.minPrice === undefined && filters.maxPrice === undefined) return '';
  return `${filters.minPrice ?? ''}-${filters.maxPrice ?? ''}`;
}

export default function ProductFilterSidebar({ facets, filters, onChange, onClose }: Props) {
  const hasActive =
    filters.brandId !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    Object.values(filters.attrFilters).some(Boolean);

  function clearAll() {
    onChange({ ...filters, brandId: undefined, minPrice: undefined, maxPrice: undefined, attrFilters: {}, page: 1 });
  }

  function setPriceRange(r: PriceRange | null) {
    onChange({ ...filters, minPrice: r?.min, maxPrice: r?.max, page: 1 });
  }

  function setBrand(id: number | undefined) {
    onChange({ ...filters, brandId: id, page: 1 });
  }

  function setAttr(slug: string, value: string) {
    const next = { ...filters.attrFilters };
    if (next[slug] === value) delete next[slug];
    else next[slug] = value;
    onChange({ ...filters, attrFilters: next, page: 1 });
  }

  const currentRangeKey = activeRangeKey(filters);

  return (
    <aside className="flex h-full flex-col overflow-y-auto text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className="font-semibold text-slate-800">Bộ lọc</span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button onClick={clearAll} className="text-xs text-[#C4480A] hover:underline">
              Xóa bộ lọc
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Đóng bộ lọc">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* Price */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Khoảng giá</p>
          <div className="space-y-1">
            {PRICE_RANGES.map(r => {
              const key = rangeKey(r);
              const active = currentRangeKey === key;
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="priceRange"
                    checked={active}
                    onChange={() => setPriceRange(active ? null : r)}
                    className="accent-[#C4480A]"
                  />
                  <span className={active ? 'font-medium text-[#C4480A]' : 'text-slate-700'}>{r.label}</span>
                </label>
              );
            })}
          </div>
          {facets?.priceRange.min !== null && facets?.priceRange.max !== null && facets?.priceRange.min !== undefined && (
            <p className="mt-1.5 text-xs text-slate-400">
              {formatProductPrice(facets.priceRange.min!)} – {formatProductPrice(facets.priceRange.max!)}
            </p>
          )}
        </div>

        {/* Brands */}
        {facets && facets.brands.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Thương hiệu</p>
            <div className="space-y-1">
              {facets.brands.map(b => (
                <label key={b.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="brand"
                    checked={filters.brandId === b.id}
                    onChange={() => setBrand(filters.brandId === b.id ? undefined : b.id)}
                    className="accent-[#C4480A]"
                  />
                  <span className={filters.brandId === b.id ? 'font-medium text-[#C4480A]' : 'text-slate-700'}>
                    {b.name}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">({b.count})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Attributes */}
        {facets?.attributes.map(attr => (
          <div key={attr.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{attr.name}</p>
            <div className="space-y-1">
              {attr.values.map(v => {
                const active = filters.attrFilters[attr.slug] === v.value;
                return (
                  <label key={v.id} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name={`attr-${attr.slug}`}
                      checked={active}
                      onChange={() => setAttr(attr.slug, v.value)}
                      className="accent-[#C4480A]"
                    />
                    <span className={active ? 'font-medium text-[#C4480A]' : 'text-slate-700'}>{v.value}</span>
                    <span className="ml-auto text-xs text-slate-400">({v.count})</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
