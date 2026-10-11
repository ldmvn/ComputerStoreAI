import { create } from 'zustand';
import { getCurrentUser } from '@/services/auth.service';
import type { AuthUser } from '@/types/user.type';
import { useCartStore } from './cart.store';
import { useWishlistStore } from './wishlist.store';
import { usePermissionStore } from './permission.store';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  login: (user: AuthUser, token: string, rememberMe: boolean) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
  setUser: (user: AuthUser) => void;
};

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'authUser';

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  login: (user, token, rememberMe) => {
    useCartStore.getState().reset();
    useWishlistStore.getState().clear();
    usePermissionStore.getState().clear();
    clearStoredAuth();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, token, isHydrated: true });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    useCartStore.getState().reset();
    useWishlistStore.getState().clear();
    usePermissionStore.getState().clear();
    clearStoredAuth();
    set({ user: null, token: null, isHydrated: true });
  },
  hydrate: async () => {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isHydrated: true });
      return;
    }

    try {
      const user = await getCurrentUser(token);
      set({ user, token, isHydrated: true });
    } catch {
      clearStoredAuth();
      set({ user: null, token: null, isHydrated: true });
    }
  },
}));
