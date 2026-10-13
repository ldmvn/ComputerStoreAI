import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import './globals.css';
import '@/styles/interactions.css';

const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

async function getBrandingMeta(): Promise<{ faviconUrl: string; version: string }> {
  try {
    const res = await fetch(`${PUBLIC_API}/content/branding`, { next: { revalidate: 60 } });
    if (!res.ok) return { faviconUrl: '', version: '' };
    const json = (await res.json()) as { data?: { faviconUrl?: string; version?: string } };
    return { faviconUrl: json.data?.faviconUrl ?? '', version: json.data?.version ?? '' };
  } catch {
    return { faviconUrl: '', version: '' };
  }
}

function resolveIconUrl(url: string, version: string): string {
  if (!url) return '/logo.png';
  const base = new URL(PUBLIC_API).origin;
  const full = url.startsWith('http') ? url : `${base}${url}`;
  return version ? `${full}?v=${version}` : full;
}

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
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
