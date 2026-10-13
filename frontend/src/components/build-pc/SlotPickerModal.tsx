'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useBuild } from './BuildProvider';
import ProductFilterSidebar from './ProductFilterSidebar';
import ProductList from './ProductList';
import type { BuildPcFilters, BuildPcFacets, BuildPcProduct } from '@/types/buildPc.type';

const DEFAULT_FILTERS: BuildPcFilters = {
  q: '',
  brandId: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  attrFilters: {},
  sort: 'default',
  page: 1,
};

export default function SlotPickerModal() {
  const { slots, meta, items, activeSlotSlug, closePicker, selectProduct } = useBuild();
  const [filters, setFilters] = useState<BuildPcFilters>(DEFAULT_FILTERS);
  const [facets, setFacets] = useState<BuildPcFacets | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const slot = slots.find(s => s.slug === activeSlotSlug) ?? null;
  const isOpen = !!activeSlotSlug && !!slot;

  // Reset when opening a new slot
  useEffect(() => {
    if (isOpen) {
      setFilters(DEFAULT_FILTERS);
      setFacets(null);
      setSidebarOpen(false);
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [activeSlotSlug, isOpen]);

  // Escape key + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closePicker]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const el = dialogRef.current;
    const getFocusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const timer = setTimeout(() => {
      const focusable = getFocusable();
      focusable[0]?.focus();
    }, 50);

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    };
    el.addEventListener('keydown', trap);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('keydown', trap);
    };
  }, [isOpen]);

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (product: BuildPcProduct) => {
      if (activeSlotSlug) selectProduct(activeSlotSlug, product);
    },
    [activeSlotSlug, selectProduct]
  );

  if (!isOpen || !slot) return null;

  const selectedProductId = activeSlotSlug ? items[activeSlotSlug]?.product.id : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closePicker}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="relative z-10 flex h-[95dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[88vh] sm:max-h-[700px] sm:max-w-4xl sm:rounded-xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-4 py-3">
          <div>
            <h2 id="picker-title" className="text-base font-semibold text-white">
              Chọn: {slot.name}
            </h2>
            {slot.badgeText && (
              <p className="text-xs font-bold italic text-blue-300">{slot.badgeText}</p>
            )}
          </div>
          <button
            onClick={closePicker}
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Filter sidebar — desktop always visible, mobile slide-in */}
          <>
            {sidebarOpen && (
              <div
                className="absolute inset-0 z-10 bg-black/20 sm:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            <div
              className={`
                absolute inset-y-0 left-0 z-20 flex w-64 flex-col bg-white shadow-xl
                transition-transform duration-200
                sm:relative sm:w-64 sm:shadow-none sm:border-r sm:border-slate-200
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
              `}
            >
              <ProductFilterSidebar
                facets={facets}
                filters={filters}
                onChange={f => { setFilters(f); setSidebarOpen(false); }}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </>

          {/* Product list */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ProductList
              slotSlug={slot.slug}
              filters={filters}
              selectedProductId={selectedProductId}
              onFiltersChange={setFilters}
              onSelect={handleSelect}
              onOpenSidebar={() => setSidebarOpen(true)}
              onFacetsUpdate={setFacets}
              inStockOnly={meta?.inStockOnly ?? false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
