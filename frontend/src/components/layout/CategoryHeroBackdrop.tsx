'use client';

import { useCategoryHeroStore } from '@/store/categoryHero.store';

export default function CategoryHeroBackdrop() {
  const active = useCategoryHeroStore(state => state.heroVisible && state.highlightOpen);
  const closeHighlight = useCategoryHeroStore(state => state.closeHighlight);
  return (
    <div
      aria-hidden="true"
      onClick={active ? closeHighlight : undefined}
      className={`fixed inset-0 z-40 bg-slate-900/45 transition-opacity duration-200 ${
        active ? 'opacity-100 cursor-default' : 'pointer-events-none opacity-0'
      }`}
    />
  );
}
