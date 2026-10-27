// Browser-facing base — defaults to the relative "/api", same origin as the
// page itself. Next.js rewrites() (next.config.js) proxies that path to the
// Express backend, so the browser never needs a separate host/CORS at all.
// This is the ONE place that fallback lives; every client-side service
// imports API_BASE_URL from here instead of re-deriving its own default.
const PUBLIC_API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');

// Server-only — a relative path has no origin to resolve against when this
// code runs in a Node.js context (Server Components, layout.tsx, Route
// Handlers), so those call sites need an absolute URL that reaches the
// backend directly. Not NEXT_PUBLIC_*, so it never ships to the browser
// bundle. Mirrors next.config.js's BACKEND_INTERNAL_URL default.
export const SERVER_API_BASE_URL = `${(process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')}/api`;

// Picks the right base for whichever environment this module is actually
// running in — Next.js bundles this file separately for the server and the
// browser, so `typeof window` is a reliable, build-time-stable check here.
export const API_BASE_URL = typeof window === 'undefined' ? SERVER_API_BASE_URL : PUBLIC_API_BASE_URL;

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiRequestError'; }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include', cache: 'no-store' });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiRequestError(data.message || `Yêu cầu thất bại (${response.status}).`, response.status);
  return data as T;
}

export function mediaUrl(url: string) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url; // already absolute — nothing to resolve
  // API_BASE_URL is absolute only when it still points at a separate host
  // (legacy/cross-origin config) — resolve against ITS origin in that case.
  if (/^https?:\/\//i.test(API_BASE_URL)) return new URL(url, new URL(API_BASE_URL).origin).href;
  // Same-origin (the common case, relative "/api"): keep the result
  // root-relative rather than turning it into a fully-qualified URL.
  // next/image treats a relative src as local and skips the
  // images.remotePatterns allowlist entirely; a same-origin ABSOLUTE URL
  // would still be treated as "remote" and rejected without an explicit
  // (unnecessary) remotePatterns entry for our own domain.
  return url.startsWith('/') ? url : `/${url}`;
}
