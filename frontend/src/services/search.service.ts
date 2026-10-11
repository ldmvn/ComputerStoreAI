import { apiRequest } from './http.client';

export type SearchProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  primaryImage: string | null;
};

export type TrendingItem = { query: string; count: number };

// Each suggestion carries a pre-built URL so the frontend never has to construct
// category/brand filter combinations itself.
export type SearchSuggestion = { label: string; url: string };

export const getSearchSuggestions = (q: string, signal?: AbortSignal) =>
  apiRequest<{ suggestions: SearchSuggestion[] }>(`/search/suggestions?q=${encodeURIComponent(q)}`, { signal });

export const getSearchProducts = (q: string, signal?: AbortSignal) =>
  apiRequest<{ products: SearchProduct[] }>(`/search/products?q=${encodeURIComponent(q)}`, { signal });

export const getTrending = (signal?: AbortSignal) =>
  apiRequest<{ trending: TrendingItem[] }>('/search/trending', { signal });

export const recordSearch = (query: string) =>
  apiRequest<{ ok: boolean }>('/search/record', {
    method: 'POST',
    body: JSON.stringify({ query }),
  }).catch(() => {});

const historyKey = (userId?: number | null) => `search_history_${userId ?? 'guest'}`;

export function getSearchHistory(userId?: number | null): string[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function addSearchHistory(query: string, userId?: number | null): void {
  try {
    const key = historyKey(userId);
    const prev = getSearchHistory(userId);
    const next = [query, ...prev.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, 8);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}
