import { apiRequest } from './http.client';

export type StoreSettings = Record<string, string>;

export const getAdminSettings = (token: string, signal?: AbortSignal) =>
  apiRequest<{ data: StoreSettings }>('/admin/settings', { signal }, token);

export const updateAdminSettings = (token: string, settings: StoreSettings, signal?: AbortSignal) =>
  apiRequest<{ success: boolean; message: string }>('/admin/settings', { method: 'PUT', body: JSON.stringify(settings), signal }, token);

export const getPublicStoreInfo = (signal?: AbortSignal) =>
  apiRequest<{ data: StoreSettings }>('/content/store-info', { signal });
