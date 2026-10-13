import { create } from 'zustand';

const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  try {
    return new URL(url, new URL(PUBLIC_API).origin).href;
  } catch {
    return url;
  }
}

interface BrandingStore {
  logoUrl: string;
  faviconUrl: string;
  version: string;
  loaded: boolean;
  hydrate: () => Promise<void>;
  setLogo: (url: string) => void;
  setFavicon: (url: string) => void;
}

export const useBrandingStore = create<BrandingStore>((set, get) => ({
  logoUrl: '',
  faviconUrl: '',
  version: '',
  loaded: false,

  hydrate: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch(`${PUBLIC_API}/content/branding`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: { logoUrl?: string; faviconUrl?: string; version?: string } };
      set({
        logoUrl: resolveMediaUrl(json.data?.logoUrl ?? ''),
        faviconUrl: resolveMediaUrl(json.data?.faviconUrl ?? ''),
        version: json.data?.version ?? '',
        loaded: true,
      });
    } catch {
      // Network failure is non-fatal — fallback to /logo.png via components
    }
  },

  setLogo: (url: string) => set({ logoUrl: resolveMediaUrl(url), loaded: true }),
  setFavicon: (url: string) => set({ faviconUrl: resolveMediaUrl(url), loaded: true }),
}));
