import { create } from 'zustand';
import type { Product } from '@/types/product.type';

export type CartItem = Pick<Product, 'id' | 'slug' | 'name' | 'price' | 'primaryImage' | 'stockQuantity'> & { quantity: number };

const KEY_PREFIX = 'ducmanhpc-cart';
function cartKey(userId?: string | number | null) {
  return userId ? `${KEY_PREFIX}-${userId}` : `${KEY_PREFIX}-guest`;
}

function persist(items: CartItem[], key: string) {
  try { localStorage.setItem(key, JSON.stringify(items)); return true; } catch { return false; }
}
function validItem(item: CartItem) {
  return item && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.slug === 'string' && typeof item.name === 'string'
    && Number.isSafeInteger(item.price) && item.price >= 0 && Number.isSafeInteger(item.stockQuantity) && item.stockQuantity > 0
    && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= item.stockQuantity
    && (item.primaryImage === null || typeof item.primaryImage === 'string');
}

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  /** Internal: the localStorage key currently in use — set at hydrate time */
  _key: string;
  hydrate: (userId?: string | number | null) => void;
  /** Reset state and mark as not hydrated so the next hydrate() re-reads storage */
  reset: () => void;
  addItem: (product: Product, buyNow?: boolean) => boolean;
  /** Add multiple products at once (reorder). Each entry's quantity is clamped to stockQuantity. */
  bulkAdd: (entries: Array<{ product: Product; quantity: number }>) => number;
  setQuantity: (id: number, quantity: number) => boolean;
  removeItem: (id: number) => boolean;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  hydrated: false,
  _key: cartKey(),

  hydrate: (userId) => {
    if (get().hydrated) return;
    const key = cartKey(userId);
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const seen = new Set<number>();
      const items: CartItem[] = Array.isArray(stored) ? stored.filter(item => {
        if (!validItem(item) || seen.has(item.id)) return false;
        seen.add(item.id); return true;
      }).slice(0, 100) : [];
      set({ items, hydrated: true, _key: key });
    } catch {
      set({ items: [], hydrated: true, _key: key });
    }
  },

  reset: () => set({ items: [], hydrated: false, _key: cartKey() }),

  addItem: (product, buyNow = false) => {
    get().hydrate();
    if (!product.isActive || product.isDeleted || product.stockQuantity <= 0) return false;
    const existing = get().items.find(item => item.id === product.id);
    const quantity = buyNow ? Math.min(existing?.quantity || 1, product.stockQuantity) : (existing?.quantity || 0) + 1;
    if (quantity > product.stockQuantity) return false;
    const item: CartItem = { id: product.id, name: product.name, slug: product.slug, price: product.price, primaryImage: product.primaryImage, stockQuantity: product.stockQuantity, quantity };
    const items = [...get().items.filter(row => row.id !== product.id), item];
    if (!persist(items, get()._key)) return false;
    set({ items }); return true;
  },

  bulkAdd: (entries) => {
    get().hydrate();
    const current = [...get().items];
    let added = 0;
    for (const { product, quantity } of entries) {
      if (!product.isActive || product.isDeleted || product.stockQuantity <= 0) continue;
      const existing = current.find(i => i.id === product.id);
      const newQty = Math.min((existing?.quantity ?? 0) + quantity, product.stockQuantity);
      if (newQty <= 0) continue;
      const item: CartItem = { id: product.id, name: product.name, slug: product.slug, price: product.price, primaryImage: product.primaryImage, stockQuantity: product.stockQuantity, quantity: newQty };
      const idx = current.findIndex(i => i.id === product.id);
      if (idx >= 0) current[idx] = item; else current.push(item);
      added++;
    }
    if (added > 0) {
      if (!persist(current, get()._key)) return 0;
      set({ items: current });
    }
    return added;
  },

  setQuantity: (id, quantity) => {
    const item = get().items.find(item => item.id === id);
    if (!item || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > item.stockQuantity) return false;
    const items = get().items.map(item => item.id === id ? { ...item, quantity } : item);
    if (!persist(items, get()._key)) return false;
    set({ items }); return true;
  },

  removeItem: id => {
    const items = get().items.filter(item => item.id !== id);
    if (!persist(items, get()._key)) return false;
    set({ items }); return true;
  },
}));
