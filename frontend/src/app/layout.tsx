import type { Metadata, Viewport } from 'next';
import MotionProvider from '@/components/ui/motion/MotionProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { SERVER_API_BASE_URL } from '@/services/http.client';
import './globals.css';
import '@/styles/interactions.css';

// generateMetadata() always runs server-side, so the fetch itself goes
// straight to the backend (SERVER_API_BASE_URL) rather than through the
// browser-facing rewrite. The resulting <link rel="icon"> href, however,
// must stay root-relative (see resolveIconUrl) — it's embedded into HTML the
// BROWSER loads, which must resolve it against the page's own public origin.
async function getBrandingMeta(): Promise<{ faviconUrl: string; version: string }> {
  try {
    const res = await fetch(`${SERVER_API_BASE_URL}/content/branding`, { next: { revalidate: 60 } });
    if (!res.ok) return { faviconUrl: '', version: '' };
    const json = (await res.json()) as { data?: { faviconUrl?: string; version?: string } };
    return { faviconUrl: json.data?.faviconUrl ?? '', version: json.data?.version ?? '' };
  } catch {
    return { faviconUrl: '', version: '' };
  }
}

function resolveIconUrl(url: string, version: string): string {
  if (!url) return '/logo.png';
  // Already root-relative (e.g. "/media/branding/...") in the common case —
  // the browser resolves it against its own origin automatically, proxied
  // to the backend by the /media rewrite in next.config.js. Only an
  // absolute URL (legacy MEDIA_PUBLIC_URL config) needs no change either.
  return version ? `${url}?v=${version}` : url;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const { faviconUrl, version } = await getBrandingMeta();
  const icon = resolveIconUrl(faviconUrl, version);
  return {
    title: 'DUCMANH PC',
    description: 'Cửa hàng PC & Laptop chính hãng',
    icons: { icon },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <MotionProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
