import { apiRequest, API_BASE_URL } from './http.client';

export type StoreSettings = Record<string, string>;

export const getAdminSettings = (token: string, signal?: AbortSignal) =>
  apiRequest<{ data: StoreSettings }>('/admin/settings', { signal }, token);

export const updateAdminSettings = (token: string, settings: StoreSettings, signal?: AbortSignal) =>
  apiRequest<{ success: boolean; message: string }>('/admin/settings', { method: 'PUT', body: JSON.stringify(settings), signal }, token);

export const getPublicStoreInfo = (signal?: AbortSignal) =>
  apiRequest<{ data: StoreSettings }>('/content/store-info', { signal });

export type SmtpStatus = {
  configured: boolean;
  host: string | null;
  port: string | null;
  from: string | null;
  hasAuth: boolean;
  lastError: string | null;
};

export const getSmtpStatus = (token: string, signal?: AbortSignal) =>
  apiRequest<{ data: SmtpStatus }>('/admin/settings/smtp-status', { signal }, token);

export const sendTestEmail = (token: string, to: string, signal?: AbortSignal) =>
  apiRequest<{ success: boolean; message: string }>(
    '/admin/settings/test-email',
    { method: 'POST', body: JSON.stringify({ to }), signal },
    token,
  );

