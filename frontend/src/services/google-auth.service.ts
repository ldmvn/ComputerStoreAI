import { AuthRequestError } from './auth.service';
import type { AuthUser } from '@/types/user.type';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const PENDING_KEY = 'googleLoginPending';
type PendingGoogleLogin = { verifier: string; rememberMe: boolean; returnTo: string; createdAt: number };

export async function startGoogleLogin(rememberMe: boolean) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const base64url = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const verifier = base64url(bytes);
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const currentPath = window.location.pathname + window.location.search;
  const pending: PendingGoogleLogin = { verifier, rememberMe, returnTo: ['/login', '/forgot-password', '/auth/google/callback'].includes(window.location.pathname) ? '/' : currentPath, createdAt: Date.now() };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const url = new URL(`${API_BASE_URL}/auth/google`, window.location.origin);
  url.searchParams.set('challenge', challenge);
  window.location.assign(url.href);
}

export function takeGoogleLoginPending(): PendingGoogleLogin | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || typeof value.verifier !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.verifier) || typeof value.rememberMe !== 'boolean' || typeof value.createdAt !== 'number' || Date.now() - value.createdAt > 600000 || value.createdAt > Date.now() || typeof value.returnTo !== 'string' || !value.returnTo.startsWith('/') || value.returnTo.startsWith('//') || value.returnTo.includes('\\')) return null;
    return value;
  } catch { return null; }
}

export async function completeGoogleLogin(code: string, verifier: string, rememberMe = false): Promise<{ user: AuthUser; token: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/google/exchange`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, verifier, rememberMe }),
      cache: 'no-store', signal: AbortSignal.timeout(20000),
    });
  } catch { throw new AuthRequestError('Không thể kết nối máy chủ. Vui lòng thử đăng nhập lại.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.token !== 'string' || !data.user?.id) throw new AuthRequestError(data.message || 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
  return data;
}

export const googleLoginErrors: Record<string, string> = {
  cancelled: 'Bạn đã hủy đăng nhập bằng Google.',
  not_configured: 'Đăng nhập Google chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
  invalid_state: 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
  invalid_token: 'Không thể xác minh tài khoản Google. Vui lòng thử lại.',
  missing_email: 'Tài khoản Google không cung cấp email hợp lệ.',
  unverified_email: 'Email Google chưa được xác minh.',
  account_disabled: 'Tài khoản hiện đang bị khóa.',
  account_conflict: 'Tài khoản đã được liên kết với tài khoản Google khác.',
  oauth_failed: 'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
};
