/** @type {import('next').NextConfig} */

// Server-only (not NEXT_PUBLIC_*) — where THIS Next.js server process reaches
// the Express backend directly, for both the /api and /media rewrites below
// and for server-side data fetching (see src/services/http.client.ts). Same
// default works for `next dev` and a co-located production process; only
// needs to change if the backend ever moves to a different host (e.g. a
// separate VPS), which is the one line to touch when that happens.
const BACKEND_INTERNAL_URL = (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

// Derive the backend hostname from NEXT_PUBLIC_API_URL so the Next.js image
// optimizer only proxies images from our own backend, not arbitrary hosts.
// With the default NEXT_PUBLIC_API_URL now being the relative "/api" (same
// origin as the page, proxied via rewrites()), media URLs are same-origin
// too and need no remotePattern at all — this only matters for a legacy
// setup where NEXT_PUBLIC_API_URL still points at a separate absolute host.
function backendHostname() {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const backendHost = backendHostname();
const isLocalhost  = backendHost === 'localhost' || backendHost === '127.0.0.1';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Plain array = Next's "afterFiles" semantics: the existing filesystem
    // API routes under app/api/* (dev-health, address-kit) are matched
    // FIRST and always win — this rewrite only catches requests that don't
    // match any of our own Next.js routes, i.e. the real Express API paths.
    return [
      { source: '/api/:path*', destination: `${BACKEND_INTERNAL_URL}/api/:path*` },
      { source: '/media/:path*', destination: `${BACKEND_INTERNAL_URL}/media/:path*` },
    ];
  },
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/account', destination: '/customer/profile', permanent: true },
      { source: '/orders', destination: '/customer/profile/orders', permanent: true },
      { source: '/build-pc', destination: '/customer/build-pc', permanent: true },
      { source: '/products', destination: '/customer/products', permanent: true },
      { source: '/cart', destination: '/customer/cart', permanent: true },
      { source: '/checkout', destination: '/customer/checkout', permanent: true },
      { source: '/wishlist', destination: '/customer/wishlist', permanent: true },
      { source: '/dashboard', destination: '/admin/dashboard', permanent: true },
      { source: '/dashboard/:path+', destination: '/admin/:path+', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      // Only needed when NEXT_PUBLIC_API_URL still points at a separate
      // absolute host (legacy/cross-origin setup) — same-origin media via
      // the /media rewrite above needs no entry here at all.
      ...(backendHost ? [{
        protocol: isLocalhost ? 'http' : 'https',
        hostname: backendHost,
      }] : []),
      // Google user profile pictures (OAuth login avatars)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
