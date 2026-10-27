import { apiRequest, API_BASE_URL, mediaUrl } from './http.client';

export type StoreSettings = Record<string, string>;

export const getAdminSettings = (token: string | null, signal?: AbortSignal) =>
  apiRequest<{ data: StoreSettings }>('/admin/settings', { signal }, token);

export const updateAdminSettings = (token: string | null, settings: StoreSettings, signal?: AbortSignal) =>
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

export const getSmtpStatus = (token: string | null, signal?: AbortSignal) =>
  apiRequest<{ data: SmtpStatus }>('/admin/settings/smtp-status', { signal }, token);

export const sendTestEmail = (token: string | null, to: string, signal?: AbortSignal) =>
  apiRequest<{ success: boolean; message: string }>(
    '/admin/settings/test-email',
    { method: 'POST', body: JSON.stringify({ to }), signal },
    token,
  );

// ── Branding ────────────────────────────────────────────────────────────────

export type BrandingData = { logoUrl: string; faviconUrl: string; version: string };

export const getAdminBranding = (token: string | null, signal?: AbortSignal) =>
  apiRequest<{ success: boolean; data: BrandingData }>('/admin/branding', { signal }, token);

export async function uploadBrandingLogo(token: string | null, file: File): Promise<{ logoUrl: string }> {
  const form = new FormData();
  form.append('logo', file);
  const res = await apiRequest<{ success: boolean; data: { logoUrl: string } }>(
    '/admin/branding/logo',
    { method: 'POST', body: form },
    token,
  );
  return { logoUrl: mediaUrl(res.data.logoUrl) };
}

export async function uploadBrandingFavicon(token: string | null, file: File): Promise<{ faviconUrl: string }> {
  const form = new FormData();
  form.append('favicon', file);
  const res = await apiRequest<{ success: boolean; data: { faviconUrl: string } }>(
    '/admin/branding/favicon',
    { method: 'POST', body: form },
    token,
  );
  return { faviconUrl: mediaUrl(res.data.faviconUrl) };
}

export const deleteBrandingLogo = (token: string | null) =>
  apiRequest<{ success: boolean; message: string }>('/admin/branding/logo', { method: 'DELETE' }, token);

export const deleteBrandingFavicon = (token: string | null) =>
  apiRequest<{ success: boolean; message: string }>('/admin/branding/favicon', { method: 'DELETE' }, token);

// ── Floating Support Widget media (channel logos / chatbot avatar) ───────────

export type WidgetMediaChannel = 'ai' | 'ai-toggle' | 'zalo' | 'messenger' | 'telegram';

export async function uploadWidgetMedia(token: string | null, channel: WidgetMediaChannel, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('image', file);
  const res = await apiRequest<{ success: boolean; data: { url: string } }>(
    `/admin/settings/widget-media/${channel}`,
    { method: 'POST', body: form },
    token,
  );
  return { url: mediaUrl(res.data.url) };
}

export const deleteWidgetMedia = (token: string | null, channel: WidgetMediaChannel) =>
  apiRequest<{ success: boolean; message: string }>(`/admin/settings/widget-media/${channel}`, { method: 'DELETE' }, token);

export async function getPublicBrandingInfo(): Promise<BrandingData> {
  try {
    const res = await fetch(`${API_BASE_URL}/content/branding`, { cache: 'no-store' });
    if (!res.ok) return { logoUrl: '', faviconUrl: '', version: '' };
    const json = (await res.json()) as { data: BrandingData };
    return json.data ?? { logoUrl: '', faviconUrl: '', version: '' };
  } catch { return { logoUrl: '', faviconUrl: '', version: '' }; }
}

