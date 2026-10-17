import { create } from 'zustand';
import { apiRequest } from '@/services/http.client';

type PermissionState = {
  permissions: Set<string>;
  loaded: boolean;
  load: (token: string | null) => Promise<void>;
  clear: () => void;
  has: (module: string, action: string) => boolean;
  hasAny: (keys: string[]) => boolean;
};

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: new Set(),
  loaded: false,

  load: async (token) => {
    try {
      const { permissions } = await apiRequest<{ permissions: string[] }>(
        '/admin/roles/my-permissions', {}, token
      );
      set({ permissions: new Set(permissions), loaded: true });
    } catch {
      set({ permissions: new Set(), loaded: true });
    }
  },

  clear: () => set({ permissions: new Set(), loaded: false }),

  has: (module, action) => {
    const p = get().permissions;
    return p.has('*') || p.has(`${module}:${action}`);
  },

  hasAny: (keys) => {
    const p = get().permissions;
    return p.has('*') || keys.some(k => p.has(k));
  },
}));
