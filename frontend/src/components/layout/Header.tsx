'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import LoginModal from './LoginModal';
import AccountDropdown from './AccountDropdown';
import { useAuthStore } from '@/store/auth.store';
import { useAuthModal } from '@/store/authModal.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import {
  ShoppingCart,
  Heart,
  User,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Puzzle,
  Sparkles,
} from 'lucide-react';
import BuildPcDropdown from './BuildPcDropdown';
import { getCategoryIcon } from '@/components/category/CategoryIcon';
import { getPublicCategories, type PublicCategory } from '@/services/category.service';
import { getPublicMenus, type PublicMenu } from '@/services/megaMenu.service';
import { MegaMenuPanel, MobileMenuGroups } from '@/components/category/MegaMenuPanel';
import SmartSearchBar from '@/components/layout/SmartSearchBar';
import { useBrandingStore } from '@/store/branding.store';
import { useCategoryHeroStore } from '@/store/categoryHero.store';

export default function Header() {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [menus, setMenus] = useState<PublicMenu[]>([]);
  const [menuError, setMenuError] = useState('');
  const [menuLoading, setMenuLoading] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [mobileCatId, setMobileCatId] = useState<number | null>(null);
  const [mobileGroupIdx, setMobileGroupIdx] = useState<number | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [buildPcOpen, setBuildPcOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const buildPcRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isHydrated && state.user?.role === 'ADMIN');
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const cartCount = useCartStore(state => state.items.reduce((count, item) => count + item.quantity, 0));
  const hydrateCart = useCartStore(state => state.hydrate);
  const openAuthModal = useAuthModal(state => state.open);
  const authModalOpen = useAuthModal(state => state.isOpen);
  const closeAuthModal = useAuthModal(state => state.close);
  useEffect(() => { hydrateCart(); }, [hydrateCart]);

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  // Hydrate wishlist on token change so other components see current state
  const wishlistToken = useAuthStore(state => state.token);
  // Confirmed server state, not the optimistic `ids` set, so the badge never over-reports.
  const wishlistCount = useWishlistStore(state => state.items.length);
  const wishlistHydrated = useWishlistStore(state => state.hydrated);
  const hydrateWishlist = useWishlistStore(state => state.hydrate);
  const clearWishlist = useWishlistStore(state => state.clear);
  // Wait for auth to settle first: clearing on a not-yet-hydrated token marks the wishlist
  // as hydrated, which would make the real fetch below be skipped once the token arrives.
  const authHydrated = useAuthStore(state => state.isHydrated);
  const hydrateBranding = useBrandingStore(s => s.hydrate);
  const logoUrl = useBrandingStore(s => s.logoUrl);
  // Khi danh sách danh mục Hero (trang chủ) còn trong viewport, nút Danh mục
  // chỉ làm nổi bật danh sách đó (qua backdrop dùng chung) thay vì mở dropdown
  // riêng của Header — tránh render hai danh sách cùng lúc.
  const heroVisible = useCategoryHeroStore(s => s.heroVisible);
  const heroHighlightOpen = useCategoryHeroStore(s => s.highlightOpen);
  const toggleHeroHighlight = useCategoryHeroStore(s => s.toggleHighlight);
  const closeHeroHighlight = useCategoryHeroStore(s => s.closeHighlight);
  const [isDesktopCategory, setIsDesktopCategory] = useState(false);
  // Thiết bị cảm ứng (iPad/Tablet) không có hover thật — trên các thiết bị này
  // trình duyệt thường mô phỏng hover ở lần chạm đầu tiên trước khi phát sự
  // kiện click, nên nếu vẫn gắn onMouseEnter/onMouseLeave thì lần chạm đầu sẽ
  // mở rồi tự đóng ngay (mở bằng hover, đóng bằng click toggle). Chỉ bật
  // hover-intent khi thiết bị thực sự hỗ trợ hover + con trỏ chính xác.
  const [supportsHover] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  useEffect(() => {
    if (!authHydrated) return;
    if (wishlistToken) { if (!wishlistHydrated) void hydrateWishlist(wishlistToken); }
    else { clearWishlist(); }
  }, [authHydrated, wishlistToken, wishlistHydrated, hydrateWishlist, clearWishlist]);

  useEffect(() => { void hydrateBranding(); }, [hydrateBranding]);

  useEffect(() => {
    const controller = new AbortController();
    getPublicCategories(controller.signal)
      .then(result => setCategories(result.categories))
      .catch(() => { if (!controller.signal.aborted) setCategories([]); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setCategoriesOpen(false);
      }
      if (buildPcRef.current && !buildPcRef.current.contains(event.target as Node)) {
        setBuildPcOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!categoriesOpen && !mobileMenuOpen) return;
    let cancelled = false;
    setMenuLoading(true);
    getPublicMenus().then(data => { if (!cancelled) { setMenus(data); setCategories(data.map(menu => menu.category)); setMenuError(''); } }).catch(() => { if (!cancelled) setMenuError('Không tải được Mega Menu. Vui lòng mở lại menu để thử lại.'); }).finally(() => { if (!cancelled) setMenuLoading(false); });
    return () => { cancelled = true; };
  }, [categoriesOpen, mobileMenuOpen]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1280px)');
    const syncCategoryMode = () => {
      const desktop = desktopQuery.matches;
      setIsDesktopCategory(desktop);
      if (closeTimer.current) clearTimeout(closeTimer.current);

      if (desktop) {
        setMobileMenuOpen(false);
        setMobileCatId(null);
        setMobileGroupIdx(null);
      } else {
        setCategoriesOpen(false);
        setActiveCategory(null);
        closeHeroHighlight();
      }
    };

    syncCategoryMode();
    desktopQuery.addEventListener('change', syncCategoryMode);
    return () => desktopQuery.removeEventListener('change', syncCategoryMode);
  }, [closeHeroHighlight]);
  // Hero đã lọt vào viewport trở lại (cuộn lên) → đảm bảo dropdown cũ của
  // Header (nếu đang mở dở từ trước) bị đóng, không hiển thị đồng thời.
  useEffect(() => { if (heroVisible) { setCategoriesOpen(false); setActiveCategory(null); } }, [heroVisible]);
  useEffect(() => { drawerRef.current?.toggleAttribute('inert', !mobileMenuOpen); }, [mobileMenuOpen]);
  useEffect(() => { if (!mobileMenuOpen) { setMobileCatId(null); setMobileGroupIdx(null); } }, [mobileMenuOpen]);
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => { setCategoriesOpen(false); setActiveCategory(null); }, 150); };
  const closeCategories = () => { setCategoriesOpen(false); setActiveCategory(null); };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button,summary,[tabindex="0"]') || []).filter(e => e.getClientRects().length);
    focusable()[0]?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
      if (event.key === 'Tab') {
        const items = focusable(); const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      previousFocus?.focus();
    };
  }, [mobileMenuOpen]);



  const toggleCategories = () => {
    setMobileMenuOpen(false);
    setCategoriesOpen(prev => {
      if (prev) setActiveCategory(null); // reset panel when closing
      return !prev;
    });
  };

  const toggleMobileMenu = () => {
    setCategoriesOpen(false);
    setActiveCategory(null);
    closeHeroHighlight();
    setMobileMenuOpen(prev => !prev);
  };

  const categoryMenuOpen = isDesktopCategory
    ? (heroVisible ? heroHighlightOpen : categoriesOpen)
    : mobileMenuOpen;

  const categoryHref = (slug: string) => `/customer/products?category=${encodeURIComponent(slug)}`;

  return (
    <>
      <header className="site-header sticky top-0 z-50 border-b backdrop-blur-md">
      {/* ===== Main Header ===== */}
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex min-h-16 flex-wrap items-center gap-x-1 gap-y-2 py-2 sm:gap-x-2 lg:h-20 lg:flex-nowrap lg:py-0 xl:gap-x-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="header-action lg:hidden"
            aria-label="Danh mục"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-category-drawer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Categories Dropdown - icon + label giống các action khác */}
          {/* Stretches to the full header-row height so the dropdown's `top-full` anchors to the
              header's bottom edge instead of the vertically-centred trigger, and so the gap
              between button and header edge stays inside the hover area. */}
          <div
            ref={categoriesRef}
            className="relative hidden self-stretch lg:flex lg:items-center"
            onMouseEnter={(isDesktopCategory && !heroVisible && supportsHover) ? () => { cancelClose(); setCategoriesOpen(true); } : undefined}
            onMouseLeave={(isDesktopCategory && !heroVisible && supportsHover) ? scheduleClose : undefined}
            onKeyDown={event => { if (isDesktopCategory && event.key === 'Escape' && !heroVisible) { closeCategories(); categoriesRef.current?.querySelector('button')?.focus(); } }}
            onBlur={event => { if (isDesktopCategory && !heroVisible && !event.currentTarget.contains(event.relatedTarget as Node)) closeCategories(); }}
          >
            <button
              type="button"
              onClick={() => {
                if (!isDesktopCategory) {
                  toggleMobileMenu();
                  return;
                }
                if (heroVisible) toggleHeroHighlight();
                else toggleCategories();
              }}
              className={`ui-header-action inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition hover:bg-primary-50 hover:text-primary-600 ${
                categoryMenuOpen ? 'bg-primary-50 text-primary-600' : 'text-slate-700'
              }`}
              aria-expanded={categoryMenuOpen}
              aria-controls={isDesktopCategory ? 'desktop-category-menu' : 'mobile-category-drawer'}
              aria-label="Danh mục"
            >
              {/* Icon 3 gạch, gạch giữa ngắn hơn */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="12" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span className="hidden lg:inline">Danh mục</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  categoryMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Khi danh mục Hero (trang chủ) còn trong viewport, nút này chỉ làm nổi
                bật danh sách đó qua CategoryHeroBackdrop — không render dropdown này
                để tránh có hai danh sách cùng lúc. */}
            {!heroVisible && (
            <div
              id="desktop-category-menu"
              className={`absolute left-0 top-full z-50 hidden max-h-[calc(100dvh-100px)] items-stretch overflow-y-auto pt-3 origin-top-left transition-all duration-200 xl:flex ${activeCategory !== null ? 'w-[min(1200px,calc(100vw-2rem))]' : ''} ${
                categoriesOpen
                  ? 'visible translate-y-0 scale-100 opacity-100'
                  : 'invisible -translate-y-2 scale-95 opacity-0 pointer-events-none'
              }`}
              onMouseEnter={cancelClose}
            >
              <div
                className="w-[min(280px,calc(100vw-2rem))] shrink-0 rounded-l-lg rounded-r-none border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 backdrop-blur-md"
                role="menu"
                aria-label="Danh mục sản phẩm"
              >
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  const isActive = activeCategory === cat.id;

                  return (
                    <Link
                      key={cat.id}
                      href={categoryHref(cat.slug)}
                      role="menuitem"
                      onMouseEnter={supportsHover ? () => setActiveCategory(cat.id) : undefined}
                      onFocus={() => setActiveCategory(cat.id)}
                      onClick={event => {
                        // Cảm ứng không có hover để xem trước danh mục con — chạm lần đầu
                        // chỉ mở panel chi tiết (giống hành vi Hero sidebar), chạm lại vào
                        // đúng danh mục đang mở mới thực sự điều hướng đi.
                        if (!supportsHover && activeCategory !== cat.id) {
                          event.preventDefault();
                          setActiveCategory(cat.id);
                          return;
                        }
                        setCategoriesOpen(false);
                        setActiveCategory(null);
                      }}
                      className={`ui-menu-item ui-category-item group flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-slate-700 hover:bg-primary-50 hover:text-primary-600'
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-primary-600" />
                    </Link>
                  );
                })}
              </div>

              {menuLoading && !menus.length && <p role="status" className="p-5 text-sm text-slate-500">Đang tải Mega Menu...</p>}
              {menuError && <p role="alert" className="p-5 text-sm text-red-600">{menuError}</p>}
              {activeCategory !== null && (() => {
                const selected = menus.find(menu => menu.category.id === activeCategory);
                return selected ? <MegaMenuPanel menu={selected} onNavigate={closeCategories} /> : null;
              })()}
            </div>
            )}
          </div>

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src={logoUrl || '/logo.png'}
              alt="DUCMANH PC"
              width={220}
              height={95}
              className="h-auto w-20 object-contain min-[360px]:w-24 lg:h-12 lg:w-auto"
              priority
              unoptimized
            />
          </Link>

          {/* Smart Search */}
          <div className="order-last flex min-w-0 basis-full items-center justify-center lg:order-none lg:flex-1 lg:basis-auto">
            <SmartSearchBar />
          </div>

          {/* Action Icons */}
          <div className="ml-auto flex shrink-0 items-center gap-0 min-[360px]:gap-1 xl:gap-3">
            {/* Build PC — mobile: link to landing page */}
            <Link
              href="/customer/build-pc"
              className="header-action lg:hidden"
              aria-label="Build PC"
              title="Build PC"
            >
              <Wrench className="h-5 w-5" />
            </Link>

            {/* Build PC — desktop: dropdown */}
            <div
              ref={buildPcRef}
              className="relative hidden self-stretch lg:flex lg:items-center"
              onKeyDown={e => { if (e.key === 'Escape') { setBuildPcOpen(false); buildPcRef.current?.querySelector('button')?.focus(); } }}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setBuildPcOpen(false); }}
            >
              <button
                type="button"
                onClick={() => setBuildPcOpen(v => !v)}
                className="ui-header-action inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-primary-50 hover:text-primary-600"
                aria-expanded={buildPcOpen}
                aria-controls="build-pc-menu"
                aria-label="Build PC"
              >
                <Wrench className="h-5 w-5" aria-hidden="true" />
                <span>Build PC</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${buildPcOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {buildPcOpen && <BuildPcDropdown onNavigate={() => setBuildPcOpen(false)} />}
            </div>

            {/* Wishlist */}
            <Link
              href="/customer/wishlist"
              className="header-action relative"
              title="Yêu thích"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              <span className="hidden lg:inline">Yêu thích</span>
              <span className="sr-only lg:hidden">Yêu thích</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold tabular-nums text-white">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                  <span className="sr-only"> sản phẩm</span>
                </span>
              )}
            </Link>

            {/* Cart with badge */}
            <Link
              href="/customer/cart"
              className="header-action relative"
              title="Giỏ hàng"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              <span className="hidden lg:inline">Giỏ hàng</span>
              <span className="sr-only lg:hidden">Giỏ hàng</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold tabular-nums text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                  <span className="sr-only"> sản phẩm</span>
                </span>
              )}
            </Link>

            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="header-action"
                aria-label="Dashboard"
                title="Dashboard"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
                <span className="hidden lg:inline">Dashboard</span>
              </Link>
            )}

            {/* User */}
            {user ? <AccountDropdown key={user.id} user={user} /> : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="header-action"
              aria-label="Đăng nhập"
            >
              <User className="h-5 w-5" />
              <span className="hidden max-w-32 truncate lg:inline">Đăng nhập</span>
            </button>
            )}
          </div>
        </div>
      </div>
      </header>

      {/* ===== Mobile Menu ===== */}
        {mobileMenuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-[60] h-[100dvh] w-screen bg-slate-900/35 xl:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu danh mục"
          />
        )}
        <aside
          id="mobile-category-drawer"
          ref={drawerRef}
          className={`fixed left-0 top-0 z-[70] flex h-[100dvh] w-[min(82vw,340px)] max-w-full flex-col overflow-hidden bg-white text-slate-800 shadow-2xl shadow-slate-900/20 transition-transform duration-200 ease-out motion-reduce:transition-none md:w-[min(52vw,420px)] xl:hidden ${mobileMenuOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Danh mục sản phẩm"
          aria-hidden={!mobileMenuOpen}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex min-w-0 items-center">
              <Image src={logoUrl || '/logo.png'} alt="DUCMANH PC" width={132} height={57} className="h-10 w-auto max-w-36 object-contain object-left" unoptimized />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="ui-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
              aria-label="Đóng menu danh mục"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            {/* ── Level 0: Build PC + category list ──────────────────────────── */}
            {mobileCatId === null && (
              <div className="px-3 py-4">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Build PC</p>
                <div className="mb-4 space-y-1">
                  <Link href="/customer/build-pc/manual" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-600">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Puzzle className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 truncate">Tự chọn linh kiện</span>
                  </Link>
                  <Link href="/customer/build-pc/ai" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#C4480A] transition-colors hover:bg-orange-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#C4480A]"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 truncate">Tối ưu cùng AI</span>
                    <span className="shrink-0 rounded-full bg-[#C4480A] px-1.5 py-0.5 text-[10px] font-bold text-white">Mới</span>
                  </Link>
                </div>
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Danh mục</p>
                {menuLoading && <p role="status" className="px-3 text-sm text-slate-500">Đang tải danh mục...</p>}
                {menuError && <p role="alert" className="px-3 text-sm text-red-600">{menuError}</p>}
              </div>
            )}
            {mobileCatId === null && (
              <nav aria-label="Danh sách danh mục">
                {categories.map(cat => {
                  const Icon = getCategoryIcon(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMobileCatId(cat.id)}
                      className="flex w-full min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-600"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary-100">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-left">{cat.name}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </button>
                  );
                })}
              </nav>
            )}

            {/* ── Level 1: Groups / children within selected category ─────────── */}
            {mobileCatId !== null && mobileGroupIdx === null && (() => {
              const cat = categories.find(c => c.id === mobileCatId);
              const menu = menus.find(m => m.category.id === mobileCatId);
              if (!cat) return null;
              const groups = menu?.groups ?? [];
              const children = groups.length === 0 ? cat.children : [];
              return (
                <>
                  {/* Back header */}
                  <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                    <button type="button" onClick={() => setMobileCatId(null)} aria-label="Quay lại danh sách danh mục" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{cat.name}</span>
                  </div>
                  {/* View all link */}
                  <Link href={categoryHref(cat.slug)} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50">
                    <span className="flex-1">Xem tất cả {cat.name}</span>
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                  {/* Groups */}
                  {groups.map((group, idx) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setMobileGroupIdx(idx)}
                      className="flex w-full min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-primary-50"
                    >
                      <span className="flex-1 text-left">{group.title}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </button>
                  ))}
                  {/* Children when no groups */}
                  {children.map(child => (
                    <Link
                      key={child.id}
                      href={categoryHref(child.slug)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-primary-50"
                    >
                      <span className="flex-1">{child.name}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </Link>
                  ))}
                  {/* Brands */}
                  {(menu?.brands.length ?? 0) > 0 && (
                    <div className="px-4 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Thương hiệu nổi bật</p>
                      {menu!.brands.map(brand => (
                        <Link key={brand.id} href={brand.href} onClick={() => setMobileMenuOpen(false)} className="block border-b border-slate-100 py-3 text-sm text-slate-700 hover:text-primary-600">
                          {brand.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── Level 2: Items within selected group ────────────────────────── */}
            {mobileCatId !== null && mobileGroupIdx !== null && (() => {
              const menu = menus.find(m => m.category.id === mobileCatId);
              const group = menu?.groups[mobileGroupIdx];
              if (!group) return null;
              return (
                <>
                  {/* Back header */}
                  <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                    <button type="button" onClick={() => setMobileGroupIdx(null)} aria-label="Quay lại nhóm danh mục" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{group.title}</span>
                  </div>
                  {/* Items — no arrows, divider lines */}
                  {group.items.map(item => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-600"
                    >
                      {item.label}
                    </Link>
                  ))}
                </>
              );
            })()}
          </div>
        </aside>
      <LoginModal isOpen={authModalOpen} onClose={closeAuthModal} />
    </>
  );
}
