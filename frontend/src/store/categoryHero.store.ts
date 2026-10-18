'use client';
import { create } from 'zustand';

// Cầu nối trạng thái giữa nút "Danh mục" trên Header và danh sách danh mục
// mặc định ở cột trái Hero Banner (HomeCategorySidebar), để khi danh sách Hero
// còn trong viewport thì Header chỉ làm nổi bật nó thay vì mở dropdown riêng.
type CategoryHeroState = {
  heroVisible: boolean;
  highlightOpen: boolean;
  setHeroVisible: (visible: boolean) => void;
  toggleHighlight: () => void;
  closeHighlight: () => void;
};

export const useCategoryHeroStore = create<CategoryHeroState>((set) => ({
  heroVisible: false,
  highlightOpen: false,
  setHeroVisible: (visible) => set(state => (
    state.heroVisible === visible ? state : { heroVisible: visible, highlightOpen: visible ? state.highlightOpen : false }
  )),
  toggleHighlight: () => set(state => ({ highlightOpen: !state.highlightOpen })),
  closeHighlight: () => set({ highlightOpen: false }),
}));
