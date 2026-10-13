'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  getPublicProductFilters,
  getPublicProducts,
  type ProductFilterMetadata,
  type ProductListQuery,
} from '@/services/product.service';
import { getPublicCategories, type PublicCategory } from '@/services/category.service';
import type { ProductListResponse } from '@/types/product.type';
import { formatProductPrice } from '@/lib/product';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import CatalogProductCard from './CatalogProductCard';
import FilterSidebar, { type FilterState } from './FilterSidebar';

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Mới nhất' },
  { value: 'priceAsc',  label: 'Giá: Thấp → Cao' },
  { value: 'priceDesc', label: 'Giá: Cao → Thấp' },
  { value: 'nameAsc',   label: 'Tên: A → Z' },
];

const EMPTY_METADATA: ProductFilterMetadata = { brands: [], attributes: [], priceRange: { min: null, max: null }, categories: [] };

const ATTR_PARAM = /^attr\[(.+)\]$/;

type Chip = { id: string; label: string; value: string; clear: Record<string, string> };

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Đang tải sản phẩm">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-square w-full rounded-t-2xl bg-slate-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-2/3 rounded bg-slate-100" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-4/5 rounded bg-slate-100" />
            <div className="mt-3 h-5 w-1/2 rounded bg-slate-100" />
            <div className="h-9 w-full rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductCatalog() {
  const search = useSearchParams();
  const router = useRouter();
  const key = search.toString();

  const categoryFilter = search.get('category') ?? '';
  const searchTerm = search.get('search') ?? '';
  const brandFilter = search.get('brand') ?? '';
  const sectionFilter = search.get('section') ?? '';
  const minPriceRaw = search.get('minPrice');
  const maxPriceRaw = search.get('maxPrice');

  // Attribute selections live in the URL as attr[<attribute-slug>]=<valueId>, so any number of
  // different attributes can be active at once and the whole state survives refresh and sharing.
  // Mega Menu links still arrive in the legacy ?attribute=&attributeValue= shape, so those fold
  // into the same state and show up in the sidebar and chips like any other selection.
  const { attrSelections, legacyAttrSlug } = useMemo(() => {
    const params = new URLSearchParams(key);
    const out: Record<string, string> = {};
    for (const [param, value] of params.entries()) {
      const match = ATTR_PARAM.exec(param);
      if (match && value) out[match[1]] = value;
    }
    const slug = params.get('attribute') ?? '';
    const value = params.get('attributeValue') ?? '';
    if (slug && value && !out[slug]) out[slug] = value;
    return { attrSelections: out, legacyAttrSlug: slug && value ? slug : null };
  }, [key]);

  const [result, setResult] = useState<Pick<ProductListResponse, 'products' | 'meta' | 'filters'> | null>(null);
  const [metadata, setMetadata] = useState<ProductFilterMetadata>(EMPTY_METADATA);
  const [allCategories, setAllCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(key);
    const query: ProductListQuery = { attr: {} };
    for (const field of ['search', 'category', 'brand', 'attribute', 'attributeValue', 'sort', 'section'] as const) {
      const v = params.get(field); if (v) query[field] = v;
    }
    for (const field of ['minPrice', 'maxPrice', 'page', 'brandId'] as const) {
      const v = params.get(field); if (v !== null && v !== '') query[field] = Number(v);
    }
    for (const [param, value] of params.entries()) {
      const match = ATTR_PARAM.exec(param);
      if (match && value) query.attr![match[1]] = value;
    }
    setLoading(true); setError('');
    getPublicProducts(query, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(e => { if (!controller.signal.aborted) { setError(e.message); setResult(null); toast.error('Không tải được danh sách sản phẩm', e.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [key, toast]);

  // Metadata depends only on the browsing context, never on the active selections — that is what
  // keeps brand and attribute options from collapsing once the user picks one.
  useEffect(() => {
    const controller = new AbortController();
    getPublicProductFilters({ category: categoryFilter, search: searchTerm, section: sectionFilter }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setMetadata(data); })
      .catch(() => { if (!controller.signal.aborted) setMetadata(EMPTY_METADATA); });
    return () => controller.abort();
  }, [categoryFilter, searchTerm, sectionFilter]);

  // All active categories — fetched once, used for the sidebar category selector.
  useEffect(() => {
    const controller = new AbortController();
    getPublicCategories(controller.signal)
      .then(data => { if (!controller.signal.aborted) setAllCategories(data.categories); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const navigate = (changes: Record<string, string>) => {
    const params = new URLSearchParams(key);
    for (const [field, value] of Object.entries(changes)) {
      if (value) params.set(field, value); else params.delete(field);
    }
    router.push(`/customer/products?${params}`);
  };

  // Narrowing filters only; `includeContext` also drops the category/search/section the user browsed in.
  const clearChanges = (includeContext: boolean) => {
    const changes: Record<string, string> = { brand: '', minPrice: '', maxPrice: '', attribute: '', attributeValue: '', page: '1' };
    for (const slug of Object.keys(attrSelections)) changes[`attr[${slug}]`] = '';
    for (const attribute of metadata.attributes) changes[`attr[${attribute.slug}]`] = '';
    if (includeContext) { changes.category = ''; changes.search = ''; changes.section = ''; }
    return changes;
  };

  // Switch category context: clear section + all narrowing filters, set new category.
  const handleCategorySelect = (slug: string) => {
    const changes = clearChanges(false);
    changes.category = slug;
    changes.section = '';
    navigate(changes);
  };

  // Chips read their labels from the metadata so the user sees "Intel", not a raw slug or id.
  // Category is intentionally excluded here — it's already shown in the page title.
  const chips = useMemo<Chip[]>(() => {
    const out: Chip[] = [];
    if (searchTerm) out.push({ id: 'search', label: 'Tìm kiếm', value: searchTerm, clear: { search: '' } });
    if (brandFilter) {
      const brand = metadata.brands.find(b => b.slug === brandFilter);
      out.push({ id: 'brand', label: 'Thương hiệu', value: brand?.name ?? brandFilter, clear: { brand: '' } });
    }
    for (const [slug, selected] of Object.entries(attrSelections)) {
      const attribute = metadata.attributes.find(a => a.slug === slug);
      const value = attribute?.values.find(v => String(v.id) === selected);
      out.push({
        id: `attr[${slug}]`,
        label: attribute?.name ?? slug,
        value: value?.value ?? selected,
        clear: { [`attr[${slug}]`]: '', ...(slug === legacyAttrSlug ? { attribute: '', attributeValue: '' } : {}) },
      });
    }
    if (minPriceRaw) out.push({ id: 'minPrice', label: 'Giá từ', value: formatProductPrice(Number(minPriceRaw)), clear: { minPrice: '' } });
    if (maxPriceRaw) out.push({ id: 'maxPrice', label: 'Giá đến', value: formatProductPrice(Number(maxPriceRaw)), clear: { maxPrice: '' } });
    return out;
  }, [searchTerm, categoryFilter, brandFilter, attrSelections, legacyAttrSlug, minPriceRaw, maxPriceRaw, metadata]);

  // Only the narrowing filters count toward the badge; category and search are the context.
  const activeFilterCount = chips.filter(chip => chip.id !== 'category' && chip.id !== 'search').length;

  const filterState: FilterState = {
    brand: brandFilter,
    attr: attrSelections,
    minPrice: minPriceRaw ? Number(minPriceRaw) : undefined,
    maxPrice: maxPriceRaw ? Number(maxPriceRaw) : undefined,
    category: categoryFilter,
  };

  const pageTitle = searchTerm
    ? `Kết quả cho "${searchTerm}"`
    : categoryFilter
      ? (metadata.categoryName ?? categoryFilter)
      : sectionFilter
        ? (metadata.sectionName ?? sectionFilter)
        : 'Tất cả sản phẩm';

  const sortSelect = (className: string) => (
    <select
      className={className}
      value={search.get('sort') || 'newest'}
      onChange={e => navigate({ sort: e.target.value, page: '1' })}
      aria-label="Sắp xếp sản phẩm"
    >
      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <section>
      {/* Mobile header */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="truncate text-xl font-semibold text-slate-900">{pageTitle}</h1>
        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className="relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          aria-label={`Bộ lọc${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Bộ lọc
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop header */}
      <div className="mb-4 hidden items-center justify-between gap-4 lg:flex">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          {!loading && result && <p className="mt-1 text-sm text-slate-500">{result.meta.total} sản phẩm</p>}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
          Sắp xếp
          {sortSelect('rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm')}
        </label>
      </div>

      <div className="mb-3 lg:hidden">
        {sortSelect('w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm')}
      </div>

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map(chip => (
            <span key={chip.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-2 text-sm text-primary-800">
              <span className="truncate">{chip.label}: {chip.value}</span>
              <button
                type="button"
                onClick={() => navigate({ ...chip.clear, page: '1' })}
                aria-label={`Xóa bộ lọc ${chip.label}`}
                className="shrink-0 rounded-full p-0.5 hover:bg-primary-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-5">
        <FilterSidebar
          state={filterState}
          brands={metadata.brands}
          attributes={metadata.attributes}
          priceRange={metadata.priceRange}
          allCategories={allCategories}
          onNavigate={navigate}
          onCategorySelect={handleCategorySelect}
          activeFilterCount={activeFilterCount}
          onClearAll={() => navigate(clearChanges(false))}
          mobileOpen={mobileFilterOpen}
          onMobileClose={() => setMobileFilterOpen(false)}
        />

        <div className="min-w-0 flex-1">
          {loading ? (
            <SkeletonGrid />
          ) : error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>
          ) : result && (
            <>
              <p role="status" className="mb-3 text-sm text-slate-500 lg:hidden">{result.meta.total} sản phẩm</p>

              {result.products.length === 0 ? (
                <EmptyState
                  variant="inline"
                  title="Không có sản phẩm phù hợp với bộ lọc."
                  description="Hãy thử điều chỉnh bộ lọc hoặc xóa bớt tiêu chí tìm kiếm."
                  action={activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => navigate(clearChanges(false))}
                      className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      Xóa bộ lọc
                    </button>
                  ) : undefined}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {result.products.map(product => <CatalogProductCard key={product.id} product={product} />)}
                </div>
              )}

              {result.meta.totalPages > 1 && (
                <nav aria-label="Phân trang sản phẩm" className="mt-6 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
                    disabled={result.meta.page <= 1}
                    onClick={() => navigate({ page: String(result.meta.page - 1) })}
                  >
                    Trang trước
                  </button>
                  <span className="text-sm tabular-nums text-slate-500">{result.meta.page} / {result.meta.totalPages}</span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
                    disabled={result.meta.page >= result.meta.totalPages}
                    onClick={() => navigate({ page: String(result.meta.page + 1) })}
                  >
                    Trang sau
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
