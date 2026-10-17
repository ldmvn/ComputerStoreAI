import type { Banner, BannerPosition, HomeBanners } from '@/types/banner.type';
import { apiRequest } from './http.client';

export const getHomeBanners = (signal?: AbortSignal) => apiRequest<HomeBanners>('/banners/home', { signal });
export const getAdminBanners = (token: string | null, signal?: AbortSignal) => apiRequest<{ banners: Banner[] }>('/admin/banners', { signal }, token);
export const saveBanner = (token: string | null, body: FormData, id?: number) => apiRequest<{ banner: Banner; message: string }>(`/admin/banners${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body }, token);
export const deleteBanner = (token: string | null, id: number) => apiRequest<{ message: string }>(`/admin/banners/${id}`, { method: 'DELETE' }, token);
export const setBannerStatus = (token: string | null, id: number, isActive: boolean) => apiRequest<{ banner: Banner }>(`/admin/banners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);
export const reorderBanners = (token: string | null, position: BannerPosition, ids: number[]) => apiRequest<{ banners: Banner[] }>('/admin/banners/reorder', { method: 'PATCH', body: JSON.stringify({ position, ids }) }, token);
