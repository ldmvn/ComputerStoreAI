import { apiRequest } from '@/services/http.client';
import type {
  BuildSlotsResponse,
  BuildPcProductsResponse,
  BuildPcFacetsResponse,
  BuildPcFilters,
  ValidateRequest,
  ValidateResponse,
  SaveBuildRequest,
  SaveBuildResponse,
  LoadBuildResponse,
} from '@/types/buildPc.type';

function buildQuery(slot: string, filters: Partial<BuildPcFilters> & { page?: number; limit?: number }): string {
  const params = new URLSearchParams();
  params.set('slot', slot);
  if (filters.q) params.set('q', filters.q);
  if (filters.brandId !== undefined) params.set('brandId', String(filters.brandId));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sort && filters.sort !== 'default') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.attrFilters) {
    for (const [slug, value] of Object.entries(filters.attrFilters)) {
      if (value) params.set(`attr[${slug}]`, value);
    }
  }
  if (filters.compatOnly) params.set('compatOnly', 'true');
  if (filters.selected) params.set('selected', filters.selected);
  return params.toString();
}

export function getBuildPcSlots(signal?: AbortSignal) {
  return apiRequest<BuildSlotsResponse>('/v1/build-pc/slots', { signal });
}

export function getBuildPcProducts(
  slot: string,
  filters: Partial<BuildPcFilters> & { page?: number; limit?: number },
  signal?: AbortSignal,
) {
  return apiRequest<BuildPcProductsResponse>(`/v1/build-pc/products?${buildQuery(slot, filters)}`, { signal });
}

export function getBuildPcFacets(
  slot: string,
  filters: Partial<BuildPcFilters>,
  signal?: AbortSignal,
) {
  return apiRequest<BuildPcFacetsResponse>(`/v1/build-pc/facets?${buildQuery(slot, filters)}`, { signal });
}

export function validateBuildPc(body: ValidateRequest, signal?: AbortSignal) {
  return apiRequest<ValidateResponse>('/v1/build-pc/validate', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
}

export function saveBuild(body: SaveBuildRequest, signal?: AbortSignal) {
  return apiRequest<SaveBuildResponse>('/v1/build-pc/builds', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
}

export function loadBuild(shareCode: string, signal?: AbortSignal) {
  return apiRequest<LoadBuildResponse>(`/v1/build-pc/builds/${encodeURIComponent(shareCode)}`, { signal });
}
