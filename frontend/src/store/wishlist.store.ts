import { create } from 'zustand';
import type { WishlistItem } from '@/services/wishlist.service';
import { addWishlist as apiAdd, getWishlist, removeWishlist as apiRemove, WishlistAuthError } from '@/services/wishlist.service';

export type { WishlistItem };

type WishlistState = {
  ids: Set<number>;
  items: WishlistItem[];
  loading: boolean;
  error: string;
  hydrated: boolean;
  pending: Set<number>;
  hydrate: (token: string | null) => Promise<void>;
  toggle: (token: string | null, productId: number) => Promise<{ favorited: boolean; reason?: 'auth' | 'unknown' }>;
  remove: (token: string | null, productId: number) => Promise<{ reason?: 'auth' | 'unknown' }>;
  setFavorited: (productId: number, favorited: boolean) => void;
  clear: () => void;
};

function applyItem(state: WishlistState, productId: number, item: WishlistItem | null): Pick<WishlistState, 'ids' | 'items'> {
  const ids = new Set(state.ids);
  const items = state.items.filter(existing => existing.productId !== productId);
  if (item) {
    ids.add(productId);
    items.unshift(item);
  } else {
    ids.delete(productId);
  }
  return { ids, items };
}

function withPending(state: WishlistState, productId: number, include: boolean) {
  const pending = new Set(state.pending);
  if (include) pending.add(productId); else pending.delete(productId);
  return { pending };
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set<number>(),
  items: [],
  loading: false,
  error: '',
  hydrated: false,
  pending: new Set<number>(),
  setFavorited: (productId, favorited) => set(state => {
    const ids = new Set(state.ids);
    if (favorited) ids.add(productId); else ids.delete(productId);
    return { ids };
  }),
  clear: () => set({ ids: new Set(), items: [], loading: false, error: '', hydrated: true }),
  hydrate: async (token) => {
    // Header and the wishlist page both hydrate on mount; `hydrated` only flips once the request
    // resolves, so without this guard the same fetch is issued twice.
    if (get().loading) return;
    set({ loading: true, error: '' });
    try {
      const items = await getWishlist(token);
      set({ ids: new Set(items.map(item => item.productId)), items, loading: false, hydrated: true });
    } catch (error) {
      if (error instanceof WishlistAuthError) { set({ ids: new Set(), items: [], loading: false, error: '', hydrated: true }); return; }
      set({ loading: false, error: error instanceof Error ? error.message : 'Không tải được danh sách yêu thích.', hydrated: true });
    }
  },
  toggle: async (token, productId) => {
    const favorited = get().ids.has(productId);
    set(state => ({ ...withPending(state, productId, true), ids: favorited ? new Set([...state.ids].filter(id => id !== productId)) : new Set([...state.ids, productId]) }));
    try {
      if (favorited) {
        await apiRemove(token, productId);
        set(state => ({ ...applyItem(state, productId, null), ...withPending(state, productId, false) }));
        return { favorited: false };
      }
      const item = await apiAdd(token, productId);
      set(state => ({ ...applyItem(state, productId, item), ...withPending(state, productId, false) }));
      return { favorited: true };
    } catch (error) {
      // rollback
      set(state => ({ ids: favorited ? new Set([...state.ids, productId]) : new Set([...state.ids].filter(id => id !== productId)), ...withPending(state, productId, false) }));
      if (error instanceof WishlistAuthError) return { favorited, reason: 'auth' };
      throw error;
    }
  },
  remove: async (token, productId) => {
    set(state => withPending(state, productId, true));
    try {
      await apiRemove(token, productId);
      set(state => ({ ...applyItem(state, productId, null), ...withPending(state, productId, false) }));
      return {};
    } catch (error) {
      set(state => withPending(state, productId, false));
      if (error instanceof WishlistAuthError) return { reason: 'auth' };
      throw error;
    }
  },
}));