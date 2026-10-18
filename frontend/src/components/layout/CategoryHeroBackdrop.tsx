'use client';

import { useCategoryHeroStore } from '@/store/categoryHero.store';

// Lớp phủ tối nhẹ khi nút Danh mục trên Header làm nổi bật danh sách danh mục
// Hero đang hiển thị. Không tự xử lý đóng — mousedown trên lớp này vẫn nổi bọt
// lên document nên listener outside-click của HomeCategorySidebar tự đóng được.
export default function CategoryHeroBackdrop() {
  const active = useCategoryHeroStore(state => state.heroVisible && state.highlightOpen);
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-40 bg-slate-900/45 transition-opacity duration-200 ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    />
  );
}
