import { apiRequest, ApiRequestError } from './http.client';

export type WishlistProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  originalPrice: number | null;
  stockQuantity: number;
  isActive: boolean;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  primaryImage: string | null;
  brand: { id: number; name: string; slug: string } | null;
  highlightSpecs: { id: number; content: string; sortOrder: number }[];
};

export type WishlistItem = { productId: number; addedAt: string; product: WishlistProduct };

export class WishlistAuthError extends ApiRequestError {
  constructor(message: string) { super(message, 401); this.name = 'WishlistAuthError'; }
}

function isUnauthorized(error: unknown): error is WishlistAuthError {
  return error instanceof ApiRequestError && error.status === 401;
}

export async function getWishlist(token: string | null, signal?: AbortSignal): Promise<WishlistItem[]> {
  try {
    const result = await apiRequest<{ items: WishlistItem[] }>('/wishlist', { signal }, token);
    return result.items;
  } catch (error) {
    if (isUnauthorized(error)) throw new WishlistAuthError(error.message);
    throw error;
  }
}

export async function addWishlist(token: string | null, productId: number, signal?: AbortSignal): Promise<WishlistItem> {
  try {
    const result = await apiRequest<{ item: WishlistItem }>(`/wishlist/${productId}`, { method: 'POST', signal }, token);
    return result.item;
  } catch (error) {
    if (isUnauthorized(error)) throw new WishlistAuthError(error.message);
    throw error;
  }
}

export async function removeWishlist(token: string | null, productId: number, signal?: AbortSignal): Promise<{ removed: boolean; message: string }> {
  try {
    return await apiRequest<{ removed: boolean; message: string }>(`/wishlist/${productId}`, { method: 'DELETE', signal }, token);
  } catch (error) {
    if (isUnauthorized(error)) throw new WishlistAuthError(error.message);
    throw error;
  }
}

export async function checkWishlist(token: string | null, productId: number, signal?: AbortSignal): Promise<boolean> {
  try {
    const result = await apiRequest<{ productId: number; favorited: boolean }>(`/wishlist/check/${productId}`, { signal }, token);
    return result.favorited;
  } catch (error) {
    if (isUnauthorized(error)) throw new WishlistAuthError(error.message);
    throw error;
  }
}