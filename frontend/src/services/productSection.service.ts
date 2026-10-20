import type { ProductSection, ProductSectionInput, QuickFilterConfig, SectionProduct } from '@/types/productSection.type';
import { apiRequest } from './http.client';

export const getHomeProductSections = (signal?: AbortSignal) => apiRequest<{ sections: ProductSection[] }>('/product-sections/home', { signal });
export const getProductSections = (token: string | null, signal?: AbortSignal) => apiRequest<{ sections: ProductSection[] }>('/admin/product-sections', { signal }, token);
export const getProductSection = (token: string | null, id: number, signal?: AbortSignal) => apiRequest<{ section: ProductSection }>(`/admin/product-sections/${id}`, { signal }, token);
export const getSectionProducts = (token: string | null, id: number, signal?: AbortSignal) => apiRequest<{ products: SectionProduct[] }>(`/admin/product-sections/${id}/products`, { signal }, token);
export const searchSectionProducts = (token: string | null, search: string, signal?: AbortSignal) => apiRequest<{ products: SectionProduct[] }>(`/admin/product-sections/products?search=${encodeURIComponent(search)}`, { signal }, token);
export const createProductSection = (token: string | null, body: ProductSectionInput) => apiRequest<{ section: ProductSection; message: string }>('/admin/product-sections', { method: 'POST', body: JSON.stringify(body) }, token);
export const updateProductSection = (token: string | null, id: number, body: ProductSectionInput) => apiRequest<{ section: ProductSection; message: string }>(`/admin/product-sections/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
export const deleteProductSection = (token: string | null, id: number) => apiRequest<{ message: string }>(`/admin/product-sections/${id}`, { method: 'DELETE' }, token);
export const setProductSectionStatus = (token: string | null, id: number, isActive: boolean) => apiRequest<{ section: ProductSection; message: string }>(`/admin/product-sections/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);
export const addProductsToSection = (token: string | null, id: number, productIds: number[]) => apiRequest<{ section: ProductSection; message: string }>(`/admin/product-sections/${id}/products`, { method: 'POST', body: JSON.stringify({ productIds }) }, token);
export const removeProductFromSection = (token: string | null, id: number, productId: number) => apiRequest<{ section: ProductSection; message: string }>(`/admin/product-sections/${id}/products/${productId}`, { method: 'DELETE' }, token);
export const reorderSectionProducts = (token: string | null, id: number, productIds: number[]) => apiRequest<{ section: ProductSection; message: string }>(`/admin/product-sections/${id}/products/reorder`, { method: 'PATCH', body: JSON.stringify({ ids: productIds }) }, token);
export const reorderProductSections = (token: string | null, ids: number[]) => apiRequest<{ sections: ProductSection[]; message: string }>('/admin/product-sections/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) }, token);
export const saveQuickFilterConfig = (token: string | null, id: number, config: QuickFilterConfig | null) => apiRequest<{ section: ProductSection; message: string }>(`/admin/product-sections/${id}/quick-filter`, { method: 'PUT', body: JSON.stringify(config) }, token);
