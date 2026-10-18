'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';
import { getCategoryIcon } from '@/components/category/CategoryIcon';
import { getPublicCategories, type PublicCategory } from '@/services/category.service';
import { getPublicMenus, type PublicMenu } from '@/services/megaMenu.service';
import { MegaMenuPanel } from '@/components/category/MegaMenuPanel';
import { useCategoryHeroStore } from '@/store/categoryHero.store';

// Danh mục mặc định ở cột trái Hero Banner — dùng chung API/dữ liệu với
// Danh mục trên Header (getPublicCategories, getPublicMenus, MegaMenuPanel).
// State mở/đóng ở đây độc lập hoàn toàn với Header để không xung đột.
export default function HomeCategorySidebar({ className = '' }: { className?: string }) {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [menus, setMenus] = useState<PublicMenu[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
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

  // Báo cho Header biết danh sách Hero có đang trong viewport hay không, để
  // Header quyết định làm nổi bật danh sách này hay mở dropdown riêng của nó.
  // rootMargin trừ chiều cao Header sticky để không tính là "hiển thị" khi
  // danh sách chỉ còn ló ra một chút phía dưới Header. Dùng callback ref thay vì
  // useEffect([]) vì phần tử thật chỉ xuất hiện sau khi categories tải xong
  // (trước đó component trả về placeholder rỗng) — callback ref tự chạy lại
  // đúng lúc DOM node thật được gắn, không phụ thuộc thời điểm effect chạy.
  // useCallback giữ danh tính hàm ref ổn định qua các lần render — nếu không,
  // mỗi lần heroVisible đổi (gây re-render) React sẽ coi ref prop đã đổi và
  // gọi lại teardown/setup liên tục, tạo vòng lặp bật/tắt không ngừng.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const setWrapperRef = useCallback((node: HTMLDivElement | null) => {
    wrapperRef.current = node;
    observerRef.current?.disconnect();
    if (!node) { setHeroVisible(false); return; }
    observerRef.current = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '-88px 0px 0px 0px' }
    );
    observerRef.current.observe(node);
  }, [setHeroVisible]);
  useEffect(() => () => { observerRef.current?.disconnect(); setHeroVisible(false); }, [setHeroVisible]);

  // Khi backdrop do Header mở tắt đi (đóng từ true → false), đóng luôn panel
  // chi tiết đang mở để quay về danh sách thuần — nhưng không đụng tới activeId
  // khi backdrop chưa từng mở (giữ nguyên hành vi click trực tiếp độc lập).
  const wasHighlightActive = useRef(highlightActive);
  useEffect(() => {
    if (wasHighlightActive.current && !highlightActive) setActiveId(null);
    wasHighlightActive.current = highlightActive;
  }, [highlightActive]);

  const close = () => setActiveId(null);

  function select(id: number) {
    setActiveId(prev => (prev === id ? null : id));
    if (!menus.length && !menuLoading) {
      setMenuLoading(true);
      getPublicMenus()
        .then(data => { setMenus(data); setMenuError(''); })
        .catch(() => setMenuError('Không tải được Mega Menu. Vui lòng thử lại.'))
        .finally(() => setMenuLoading(false));
    }
  }

  useEffect(() => {
    if (activeId === null && !highlightActive) return;
    const closeAll = () => { close(); if (highlightActive) closeHighlight(); };
    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) closeAll();
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeAll(); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeId, highlightActive, closeHighlight]);

  if (!categories.length) return <div className={className} aria-hidden="true" />;

  const activeMenu = activeId !== null ? menus.find(m => m.category.id === activeId) : undefined;

  return (
    <div ref={setWrapperRef} className={`relative ${highlightActive ? 'z-[45]' : ''} ${className}`}>
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
              onClick={() => select(cat.id)}
              aria-expanded={isActive}
              className={`ui-menu-item ui-category-item group flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors ${
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
        <div
          className="absolute left-full top-0 z-30 ml-3 hidden min-w-[min(820px,calc(100vw-20rem))] max-w-[calc(100vw-2rem)] origin-top-left animate-support-toggle-in md:block"
          role="dialog"
          aria-label="Chi tiết danh mục"
        >
          <div className="relative">
            <button
              type="button"
              onClick={close}
              aria-label="Đóng"
              className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-md ring-1 ring-slate-200 transition-colors hover:text-primary-600"
            >
              <X className="h-4 w-4" />
            </button>
            {menuLoading && !menus.length && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg"><p className="text-sm text-slate-500">Đang tải...</p></div>
            )}
            {menuError && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg"><p className="text-sm text-red-600">{menuError}</p></div>
            )}
            {activeMenu && <MegaMenuPanel menu={activeMenu} onNavigate={close} />}
            {!activeMenu && !menuLoading && !menuError && (() => {
              const cat = categories.find(c => c.id === activeId);
              if (!cat) return null;
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
                  <Link href={`/customer/products?category=${encodeURIComponent(cat.slug)}`} onClick={close} className="text-sm font-medium text-primary-700 hover:underline">
                    Xem sản phẩm {cat.name}
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
