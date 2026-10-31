import { create } from 'zustand';
import { apiRequest } from '@/services/http.client';

type FeatureFlags = {
  build_pc: boolean;
  reviews: boolean;
  wishlist: boolean;
};

type FeaturesState = {
  flags: FeatureFlags;
  loaded: boolean;
  load: () => Promise<void>;
};

export const useFeaturesStore = create<FeaturesState>((set, get) => ({
  flags: { build_pc: true, reviews: true, wishlist: true },
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const res = await apiRequest<{ data: FeatureFlags }>('/content/features');
      set({ flags: res.data, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
