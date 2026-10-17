import { apiRequest } from './http.client';
import type { Category } from './category.service';
export type ItemType = 'CATEGORY' | 'BRAND' | 'PRICE_FILTER' | 'ATTRIBUTE_FILTER' | 'CUSTOM_URL';
export type MenuItemInput = { label: string; type: ItemType; categoryId?: number | null; brandId?: number | null; attributeId?: number | null; attributeValueId?: number | null; attributeName?: string | null; attributeValue?: string | null; minPrice?: number | null; maxPrice?: number | null; customUrl?: string | null; sortOrder: number; isActive: boolean };
export type MenuItem = MenuItemInput & { id: number; invalid?: boolean; productCount?: number };
export type GroupInput = { title: string; sortOrder: number; columnSpan: number; isActive: boolean };
export type MenuGroup = GroupInput & { id: number; items: MenuItem[] };
export type AdminMenu = { id: number; isActive: boolean; groups: MenuGroup[]; brands: { brandId: number }[] };
export type AttributeOption = { id: number; name: string; slug: string; type: 'SELECT' | 'MULTI_SELECT'; values: { id: number; value: string }[] };
export type PublicMenu = { category: Pick<Category, 'id' | 'name' | 'slug' | 'icon'> & { href: string; children: Pick<Category, 'id' | 'name' | 'slug' | 'icon'>[] }; groups: { id: number; title: string; columnSpan: number; items: { id: number; label: string; type: ItemType; href: string }[] }[]; brands: { id: number; name: string; slug: string; logoUrl: string | null; href: string }[] };
const root = '/admin/mega-menu';
export const getAdminMenu = (token: string | null, id: number, signal?: AbortSignal) => apiRequest<{ category: Category; menu: AdminMenu | null }>(`${root}/categories/${id}`, { signal }, token);
export const getMenuOptions = (token: string | null, signal?: AbortSignal) => apiRequest<{ attributes: AttributeOption[] }>(`${root}/options`, { signal }, token);
export const saveMenu = (token: string | null, id: number, isActive: boolean, brandIds: number[]) => apiRequest(`${root}/categories/${id}`, { method: 'PUT', body: JSON.stringify({ isActive, brandIds }) }, token);
export const saveGroup = (token: string | null, categoryId: number, id: number | null, body: GroupInput) => apiRequest(id ? `${root}/groups/${id}` : `${root}/categories/${categoryId}/groups`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }, token);
export const deleteGroup = (token: string | null, id: number) => apiRequest(`${root}/groups/${id}`, { method: 'DELETE' }, token);
export const saveItem = (token: string | null, groupId: number, id: number | null, body: MenuItemInput) => apiRequest(`${root}/groups/${groupId}/items${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }, token);
export const deleteItem = (token: string | null, id: number) => apiRequest(`${root}/items/${id}`, { method: 'DELETE' }, token);
let cached: { at: number; menus: PublicMenu[] } | null = null;
let pending: Promise<PublicMenu[]> | null = null;
export function getPublicMenus() {
  if (cached && Date.now() - cached.at < 30000) return Promise.resolve(cached.menus);
  if (!pending) pending = apiRequest<{ menus: PublicMenu[] }>('/mega-menu').then(result => { if (!Array.isArray(result.menus)) throw new Error('Dữ liệu Mega Menu không hợp lệ.'); cached = { at: Date.now(), menus: result.menus }; return result.menus; }).finally(() => { pending = null; });
  return pending;
}
export function invalidateMenuCache() { cached = null; }
