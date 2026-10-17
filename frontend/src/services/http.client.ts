export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

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
  return new URL(url, new URL(API_BASE_URL).origin).href;
}
