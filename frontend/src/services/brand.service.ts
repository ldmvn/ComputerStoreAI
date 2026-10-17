import { apiRequest } from './http.client';

export type Brand = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BrandInput = Pick<Brand, 'name' | 'slug' | 'websiteUrl' | 'description' | 'sortOrder' | 'isActive'>;

export const getAdminBrands = (token: string | null, signal?: AbortSignal) => apiRequest<{ brands: Brand[] }>('/admin/brands', { signal }, token);
export const createBrand = (token: string | null, body: FormData) => apiRequest<{ brand: Brand; message: string }>('/admin/brands', { method: 'POST', body }, token);
export const updateBrand = (token: string | null, id: number, body: FormData) => apiRequest<{ brand: Brand; message: string }>(`/admin/brands/${id}`, { method: 'PUT', body }, token);
export const deleteBrand = (token: string | null, id: number) => apiRequest<{ message: string }>(`/admin/brands/${id}`, { method: 'DELETE' }, token);
export const setBrandStatus = (token: string | null, id: number, isActive: boolean) => apiRequest<{ brand: Brand; message: string }>(`/admin/brands/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);