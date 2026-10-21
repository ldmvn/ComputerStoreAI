/** @type {import('next').NextConfig} */

// Derive the backend hostname from NEXT_PUBLIC_API_URL so the Next.js image
// optimizer only proxies images from our own backend, not arbitrary hosts.
// Falls back to localhost for local development.
function backendHostname() {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  try {
    return new URL(raw).hostname;
  } catch {
    return 'localhost';
  }
}

const backendHost = backendHostname();
const isLocalhost  = backendHost === 'localhost' || backendHost === '127.0.0.1';

const nextConfig = {
  reactStrictMode: true,
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
      // Backend media server (products, banners, brands, branding, reviews)
      {
        protocol: isLocalhost ? 'http' : 'https',
        hostname: backendHost,
      },
      // Google user profile pictures (OAuth login avatars)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
