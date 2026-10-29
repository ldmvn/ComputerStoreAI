import { create } from 'zustand';
import { getCurrentUser, logoutAccount } from '@/services/auth.service';
import type { AuthUser } from '@/types/user.type';
import { useCartStore } from './cart.store';
import { useWishlistStore } from './wishlist.store';
import { usePermissionStore } from './permission.store';
import { clearSession } from '@/lib/chatHistory';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: AuthUser) => void;
};

function clearStores() {
  useCartStore.getState().reset();
  useWishlistStore.getState().clear();
  usePermissionStore.getState().clear();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  login: (user, token) => {
    clearStores();
    // Token stored in memory only — httpOnly cookie handles persistence.
    set({ user, token, isHydrated: true });
  },
  setUser: (user) => set({ user }),
  logout: async () => {
    const prev = useAuthStore.getState().user;
    if (prev) clearSession(prev.id);
    clearStores();
    set({ user: null, token: null, isHydrated: true });
    try { await logoutAccount(); } catch { /* cookie cleared server-side best-effort */ }
  },
  hydrate: async () => {
    try {
      // Cookie is sent automatically via credentials: 'include' — no token needed.
      const user = await getCurrentUser();
      set({ user, token: null, isHydrated: true });
    } catch {
      set({ user: null, token: null, isHydrated: true });
    }
  },
}));
