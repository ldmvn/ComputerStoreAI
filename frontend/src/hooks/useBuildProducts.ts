'use client';

import { useState, useEffect, useRef } from 'react';
import { getBuildPcProducts, getBuildPcFacets } from '@/services/buildPc.service';
import type { BuildPcProduct, BuildPcProductMeta, BuildPcFacets, BuildPcFilters } from '@/types/buildPc.type';

type State = {
  products: BuildPcProduct[];
  facets: BuildPcFacets | null;
  meta: BuildPcProductMeta | null;
  loading: boolean;
  error: string | null;
};

const INITIAL: State = { products: [], facets: null, meta: null, loading: false, error: null };
const LIMIT = 10;

export function useBuildProducts(slotSlug: string, filters: BuildPcFilters) {
  const [state, setState] = useState<State>(INITIAL);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFiltersRef = useRef<BuildPcFilters | null>(null);

  useEffect(() => {
    if (!slotSlug) return;

    const prevFilters = prevFiltersRef.current;
    const pageOnly =
      prevFilters !== null &&
      prevFilters.q === filters.q &&
      prevFilters.brandId === filters.brandId &&
      prevFilters.minPrice === filters.minPrice &&
      prevFilters.maxPrice === filters.maxPrice &&
      prevFilters.sort === filters.sort &&
      JSON.stringify(prevFilters.attrFilters) === JSON.stringify(filters.attrFilters) &&
      prevFilters.page !== filters.page;
    prevFiltersRef.current = filters;

    const doFetch = (signal: AbortSignal) => {
      setState(s => ({ ...s, loading: true, error: null }));

      const productPromise = getBuildPcProducts(slotSlug, { ...filters, limit: LIMIT }, signal);
      const facetsPromise = pageOnly
        ? Promise.resolve(null)
        : getBuildPcFacets(slotSlug, { ...filters, page: undefined }, signal);

      Promise.all([productPromise, facetsPromise])
        .then(([prodRes, facetRes]) => {
          setState(s => ({
            ...s,
            products: prodRes.data,
            meta: prodRes.meta,
            facets: facetRes ? facetRes.data : s.facets,
            loading: false,
            error: null,
          }));
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setState(s => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải dữ liệu.',
          }));
        });
    };

    const controller = new AbortController();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = prevFilters !== null && prevFilters.q !== filters.q ? 300 : 0;
    debounceRef.current = setTimeout(() => doFetch(controller.signal), delay);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotSlug, filters.q, filters.brandId, filters.minPrice, filters.maxPrice, filters.sort, filters.page, JSON.stringify(filters.attrFilters)]);

  return state;
}
