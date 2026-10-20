'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getCategoryIcon } from '@/components/category/CategoryIcon';
import { getPublicCategories, type PublicCategory } from '@/services/category.service';
import { getPublicMenus, type PublicMenu } from '@/services/megaMenu.service';
import { MegaMenuPanel } from '@/components/category/MegaMenuPanel';
import { useCategoryHeroStore } from '@/store/categoryHero.store';

// Danh mục mặc định ở cột trái Hero Banner — dùng chung API/dữ liệu với
// Danh mục trên Header (getPublicCategories, getPublicMenus, MegaMenuPanel).
// State mở/đóng ở đây độc lập hoàn toàn với Header để không xung đột.
// Hover → mở panel chi tiết; Click → điều hướng tới trang sản phẩm đã lọc.
export default function HomeCategorySidebar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [menus, setMenus] = useState<PublicMenu[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Debounce đóng panel để không nhấp nháy khi di chuột từ danh sách sang panel.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setHeroVisible = useCategoryHeroStore(state => state.setHeroVisible);
  const highlightActive = useCategoryHeroStore(state => state.heroVisible && state.highlightOpen);
  const closeHighlight = useCategoryHeroStore(state => state.closeHighlight);

  useEffect(() => {
    const controller = new AbortController();
    getPublicCategories(controller.signal)
      .then(result => setCategories(result.categories))
      .catch(() => { if (!controller.signal.aborted) setCategories([]); });
    return () => controller.abort();
  }, []);

  // Sidebar chỉ thực sự "đang hiển thị" khi CẢ HAI đúng: (1) viewport đủ rộng
  // cho chế độ Desktop (>=1280px, đồng bộ breakpoint xl với CSS ẩn sidebar ở
  // Tablet) và (2) phần tử thật sự nằm trong vùng nhìn thấy (IntersectionObserver).
  const [isDesktopWidth, setIsDesktopWidth] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches
  );
  const [intersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsDesktopWidth(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setHeroVisible(isDesktopWidth && intersecting);
  }, [isDesktopWidth, intersecting, setHeroVisible]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const setWrapperRef = useCallback((node: HTMLDivElement | null) => {
    wrapperRef.current = node;
    observerRef.current?.disconnect();
    if (!node) { setIntersecting(false); return; }
    observerRef.current = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '-88px 0px 0px 0px' }
    );
    observerRef.current.observe(node);
  }, []);
  useEffect(() => () => { observerRef.current?.disconnect(); setIntersecting(false); }, []);

  // Khi backdrop do Header mở tắt đi, đóng luôn panel chi tiết đang mở.
  const wasHighlightActive = useRef(highlightActive);
  useEffect(() => {
    if (wasHighlightActive.current && !highlightActive) setActiveId(null);
    wasHighlightActive.current = highlightActive;
  }, [highlightActive]);

  const close = useCallback(() => setActiveId(null), []);

  function scheduleClose() {
    closeTimerRef.current = setTimeout(close, 150);
  }

  function cancelClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  // Escape đóng panel và tắt highlight của Header nếu đang bật.
  useEffect(() => {
    if (activeId === null && !highlightActive) return;
    const closeAll = () => { close(); if (highlightActive) closeHighlight(); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeAll(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeId, highlightActive, closeHighlight, close]);

  function openPanel(id: number) {
    cancelClose();
    setActiveId(id);
    if (!menus.length && !menuLoading) {
      setMenuLoading(true);
      getPublicMenus()
        .then(data => { setMenus(data); setMenuError(''); })
        .catch(() => setMenuError('Không tải được Mega Menu. Vui lòng thử lại.'))
        .finally(() => setMenuLoading(false));
    }
  }

  if (!categories.length) {
    return (
      <div
        className={`${className} h-full min-h-[480px] rounded-xl border border-slate-200/80 bg-white/70 animate-pulse`}
        aria-hidden="true"
      />
    );
  }

  const activeMenu = activeId !== null ? menus.find(m => m.category.id === activeId) : undefined;

  return (
    // onMouseLeave/onMouseEnter trên wrapper bao gồm cả panel (absolute child),
    // nên di chuột giữa danh sách và panel không đóng panel.
    // pl-3 trên panel container (thay vì ml-3) giúp vùng hover phủ qua khoảng cách 12px.
    <div
      ref={setWrapperRef}
      className={`relative ${(activeId !== null || highlightActive) ? 'z-[45]' : ''} ${className}`}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <nav
        aria-label="Danh mục sản phẩm"
        className={`h-full w-full overflow-y-auto rounded-xl border bg-white p-1.5 transition-shadow duration-200 ${
          highlightActive ? 'border-primary-200 shadow-lg shadow-slate-900/15' : 'border-slate-200 shadow-sm shadow-slate-900/[0.03]'
        }`}
      >
        {categories.map(cat => {
          const Icon = getCategoryIcon(cat.icon);
          const isActive = activeId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onMouseEnter={() => openPanel(cat.id)}
              onClick={() => router.push(`/customer/products?category=${encodeURIComponent(cat.slug)}`)}
              aria-expanded={isActive}
              className={`ui-menu-item ui-category-item group flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-50 text-primary-600' : 'text-slate-700 hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{cat.name}</span>
              <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-primary-600 ${isActive ? 'rotate-90' : ''}`} />
            </button>
          );
        })}
      </nav>

      {activeId !== null && (
        // bottom-0 + top-0 = panel stretches to full sidebar height.
        // h-full overflow-y-auto trên inner div cho phép cuộn nếu nội dung nhiều.
        <div
          className="absolute bottom-0 left-full top-0 z-30 hidden min-w-[min(820px,calc(100vw-20rem))] max-w-[calc(100vw-2rem)] origin-top-left animate-support-toggle-in pl-3 md:block"
          role="dialog"
          aria-label="Chi tiết danh mục"
        >
          <div className="h-full overflow-y-auto">
            {menuLoading && !menus.length && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg"><p className="text-sm text-slate-500">Đang tải...</p></div>
            )}
            {menuError && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg"><p className="text-sm text-red-600">{menuError}</p></div>
            )}
            {activeMenu && <MegaMenuPanel menu={activeMenu} onNavigate={close} />}
            {!activeMenu && !menuLoading && !menuError && (
              <div className="h-full rounded-xl border border-slate-200 bg-white shadow-lg" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
