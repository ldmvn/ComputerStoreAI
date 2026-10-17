import { apiRequest } from './http.client';

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: number | null;
  parent?: { id: number; name: string } | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = Pick<Category, 'name' | 'slug' | 'description' | 'icon' | 'parentId' | 'sortOrder' | 'isActive'>;
export type PublicCategory = Pick<Category, 'id' | 'name' | 'slug' | 'icon'> & { children: Pick<Category, 'id' | 'name' | 'slug' | 'icon'>[] };

export const getAdminCategories = (token: string | null, signal?: AbortSignal) => apiRequest<{ categories: Category[] }>('/admin/categories', { signal }, token);
export const getAdminCategory = (token: string | null, id: number, signal?: AbortSignal) => apiRequest<{ category: Category }>(`/admin/categories/${id}`, { signal }, token);
export const createCategory = (token: string | null, body: CategoryInput) => apiRequest<{ category: Category; message: string }>('/admin/categories', { method: 'POST', body: JSON.stringify(body) }, token);
export const updateCategory = (token: string | null, id: number, body: CategoryInput) => apiRequest<{ category: Category; message: string }>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
export const deleteCategory = (token: string | null, id: number) => apiRequest<{ message: string }>(`/admin/categories/${id}`, { method: 'DELETE' }, token);
export const setCategoryStatus = (token: string | null, id: number, isActive: boolean) => apiRequest<{ category: Category; message: string }>(`/admin/categories/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);
export const setCategoryOrder = (token: string | null, id: number, sortOrder: number) => apiRequest<{ category: Category; message: string }>(`/admin/categories/${id}/order`, { method: 'PATCH', body: JSON.stringify({ sortOrder }) }, token);
export const getPublicCategories = (signal?: AbortSignal) => apiRequest<{ categories: PublicCategory[] }>('/categories/menu', { signal });