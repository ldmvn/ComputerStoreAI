import type { Product, ProductListResponse, ProductStatistics } from '@/types/product.type';
import { apiRequest, mediaUrl } from './http.client';

export type ProductListQuery = { page?: number; limit?: number; search?: string; category?: string; brand?: string; brandId?: number; minPrice?: number; maxPrice?: number; attribute?: string; attributeValue?: string; attr?: Record<string, string>; status?: string; stock?: string; sort?: string; section?: string };

export type FilterBrand = { id: number; name: string; slug: string; productCount: number };
export type FilterCategory = { id: number; name: string; slug: string; productCount: number };
export type FilterAttributeValue = { id: number; value: string; productCount: number };
export type FilterAttribute = { id: number; name: string; slug: string; type: string; values: FilterAttributeValue[] };
export type ProductFilterMetadata = { brands: FilterBrand[]; attributes: FilterAttribute[]; priceRange: { min: number | null; max: number | null }; categoryName?: string | null; sectionName?: string | null; categories?: FilterCategory[] };
export type FilterContextQuery = { category?: string; search?: string; section?: string };

function queryString(query: ProductListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    if (key === 'attr') {
      Object.entries(value as Record<string, string>).forEach(([slug, selected]) => { if (selected) params.set(`attr[${slug}]`, selected); });
      return;
    }
    params.set(key, String(value));
  });
  return params.toString();
}

export const getAdminProducts = (token: string, query: ProductListQuery = {}, signal?: AbortSignal) => apiRequest<ProductListResponse>(`/admin/products?${queryString(query)}`, { signal }, token);
export const getPublicProducts = (query: ProductListQuery = {}, signal?: AbortSignal) => apiRequest<Pick<ProductListResponse, 'products' | 'meta' | 'filters'>>(`/products?${queryString(query)}`, { signal });
export const getPublicProductFilters = (context: FilterContextQuery = {}, signal?: AbortSignal) => apiRequest<ProductFilterMetadata>(`/products/filters?${queryString(context)}`, { signal });
export const getPublicProduct = (slug: string, signal?: AbortSignal) => apiRequest<{ product: Product & ProductStatistics }>(`/products/${encodeURIComponent(slug)}`, { signal });
export const recordProductView = (slug: string, viewId: string, signal?: AbortSignal) => apiRequest<{ viewCount: number }>(`/products/${encodeURIComponent(slug)}/views`, { method: 'POST', body: JSON.stringify({ viewId }), signal });
export const getAdminProduct = (token: string, id: number, signal?: AbortSignal) => apiRequest<{ product: Product }>(`/admin/products/${id}`, { signal }, token);

export async function uploadProductDescriptionImage(token: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const result = await apiRequest<{ data: { url: string } }>('/admin/products/description-image', { method: 'POST', body: form }, token);
  return mediaUrl(result.data.url);
}
export const getProductCategories = (token: string, signal?: AbortSignal) => apiRequest<{ categories: string[] }>('/admin/products/categories', { signal }, token);
export const createProduct = (token: string, body: FormData) => apiRequest<{ product: Product; message: string }>('/admin/products', { method: 'POST', body }, token);
export const updateProduct = (token: string, id: number, body: FormData) => apiRequest<{ product: Product; message: string }>(`/admin/products/${id}`, { method: 'PUT', body }, token);
export const setProductStatus = (token: string, id: number, isActive: boolean) => apiRequest<{ product: Product; message: string }>(`/admin/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);
export const deleteProduct = (token: string, id: number) => apiRequest<{ message: string }>(`/admin/products/${id}`, { method: 'DELETE' }, token);
export const deleteProductImage = (token: string, productId: number, imageId: number) => apiRequest<{ product: Product; message: string }>(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' }, token);
