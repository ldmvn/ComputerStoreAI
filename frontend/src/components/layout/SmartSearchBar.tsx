'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Clock, Flame, Lightbulb } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  getSearchSuggestions,
  getSearchProducts,
  getTrending,
  recordSearch,
  getSearchHistory,
  addSearchHistory,
  type SearchProduct,
  type SearchSuggestion,
  type TrendingItem,
} from '@/services/search.service';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice } from '@/lib/product';

// ── Trending chip ─────────────────────────────────────────────────────────────

function TrendChip({ item, rank, onSelect }: { item: TrendingItem; rank: number; onSelect: (q: string) => void }) {
  const isTop3 = rank <= 3;
  const medal = rank === 1 ? '⭐' : rank === 2 ? '⭐' : '🔥';
  return (
    <button
      type="button"
      onClick={() => onSelect(item.query)}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition hover:opacity-80 active:scale-95 ${
        isTop3
          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      <span className="text-[11px] leading-none">{isTop3 ? `${medal}${rank}` : '🔥'}</span>
      <span>{item.query}</span>
    </button>
  );
}

// ── Product suggestion row ────────────────────────────────────────────────────

function ProductRow({ product, onSelect }: { product: SearchProduct; onSelect: () => void }) {
  const hasDiscount = product.originalPrice != null && product.originalPrice > product.price;
  const pct = hasDiscount ? Math.round((1 - product.price / product.originalPrice!) * 100) : 0;

  return (
    <Link
      href={`/products/${encodeURIComponent(product.slug)}`}
      onClick={onSelect}
      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
        {product.primaryImage ? (
          <Image
            src={mediaUrl(product.primaryImage)}
            alt={product.name}
            fill
            sizes="48px"
            className="object-contain p-0.5"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Search className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug text-slate-800">{product.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-primary-600">
            {formatProductPrice(product.price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-slate-400 line-through">
                {formatProductPrice(product.originalPrice!)}
              </span>
              <span className="rounded-sm bg-primary-50 px-1 py-px text-[10px] font-semibold text-primary-700">
                -{pct}%
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── SmartSearchBar ────────────────────────────────────────────────────────────

export default function SmartSearchBar() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const listboxId = useId();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Empty state data
  const [history, setHistory] = useState<string[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);

  // Typed state data
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load trending once on mount
  useEffect(() => {
    const ctrl = new AbortController();
    getTrending(ctrl.signal).then(d => setTrending(d.trending)).catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Load history when open and user changes
  useEffect(() => {
    if (open) setHistory(getSearchHistory(user?.id));
  }, [open, user?.id]);

  // Debounced search when query changes.
  // Single-char queries (< 2) are intentionally skipped — the backend requires ≥ 2 chars
  // to avoid overly broad results; the UI shows a "type more" hint instead.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (query.trim().length < 2) {
      setSuggestions([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      Promise.all([
        getSearchSuggestions(query, ctrl.signal),
        getSearchProducts(query, ctrl.signal),
      ])
        .then(([s, p]) => {
          setSuggestions(s.suggestions);
          setProducts(p.products);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = useCallback((term: string) => {
    const q = term.trim();
    if (!q) return;
    addSearchHistory(q, user?.id);
    void recordSearch(q);
    setQuery(q);
    setOpen(false);
    setActiveIdx(-1);
    router.push(`/customer/products?search=${encodeURIComponent(q)}`);
  }, [router, user?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query);
  };

  const handleCloseDropdown = () => {
    setOpen(false);
    setActiveIdx(-1);
  };

  // Derived query states
  const isTyped = query.trim().length > 0;

  // Keyboard-navigable flat list — suggestions carry their pre-built URL
  type NavItem =
    | { type: 'suggestion'; label: string; url: string }
    | { type: 'product';    value: string }
    | { type: 'history';    value: string };

  const navItems: NavItem[] = isTyped
    ? [
        ...suggestions.map(s => ({ type: 'suggestion' as const, label: s.label, url: s.url })),
        ...products.map(p => ({ type: 'product' as const, value: p.slug })),
      ]
    : history.map(h => ({ type: 'history' as const, value: h }));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { if (e.key === 'ArrowDown') { setOpen(true); } return; }
    if (e.key === 'Escape') { handleCloseDropdown(); inputRef.current?.blur(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < navItems.length) {
        const item = navItems[activeIdx];
        if (item.type === 'suggestion') {
          addSearchHistory(item.label, user?.id);
          void recordSearch(item.label);
          handleCloseDropdown();
          router.push(item.url);
          return;
        } else if (item.type === 'product') {
          const product = products[activeIdx - suggestions.length];
          if (product) {
            addSearchHistory(product.name, user?.id);
            handleCloseDropdown();
            router.push(`/products/${encodeURIComponent(product.slug)}`);
            return;
          }
        } else {
          navigate(item.value); // history → text search
          return;
        }
      }
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const showEmpty = open && !isTyped;
  const showTyped = open && isTyped;
  const hasHistory = history.length > 0;
  const hasTrending = trending.length > 0;
  const hasSuggestions = suggestions.length > 0;
  const hasProducts = products.length > 0;
  const dropdownVisible = open && (
    showEmpty ? (hasHistory || hasTrending) : showTyped ? true : false
  );

  return (
    <div ref={containerRef} className="relative w-full min-w-0 lg:w-3/4 lg:max-w-[500px]">
      {/* Input row */}
      <form onSubmit={handleSubmit} role="search" className="flex">
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="search"
            value={query}
            role="combobox"
            aria-expanded={dropdownVisible}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIdx >= 0 ? `${listboxId}-option-${activeIdx}` : undefined}
            onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tên sản phẩm, từ khóa cần tìm"
            className="w-full rounded-l-full border border-r-0 border-primary-400 bg-white py-2.5 pl-4 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-400"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="shrink-0 rounded-r-full bg-primary-600 px-4 py-2.5 text-white transition hover:bg-primary-700 active:bg-primary-800"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {/* Dropdown */}
      {dropdownVisible && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Gợi ý tìm kiếm"
          className="absolute left-0 top-full z-[200] mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
        >
          <div className="max-h-[70vh] overflow-y-auto">
            {/* ── EMPTY STATE ─────────────────────────────────────── */}
            {showEmpty && (
              <>
                {hasHistory && (
                  <section>
                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">Tìm kiếm gần đây</p>
                    {history.map((h, i) => (
                      <button
                        key={h}
                        id={`${listboxId}-option-${i}`}
                        role="option"
                        aria-selected={activeIdx === i}
                        type="button"
                        onClick={() => navigate(h)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 ${activeIdx === i ? 'bg-slate-50' : ''}`}
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 truncate">{h}</span>
                      </button>
                    ))}
                  </section>
                )}

                {hasTrending && (
                  <>
                    {hasHistory && <div className="mx-3 border-t border-slate-100" />}
                    <section className="px-3 pb-3 pt-2">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        Xu hướng tìm kiếm
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {trending.map((item, i) => (
                          <TrendChip key={item.query} item={item} rank={i + 1} onSelect={navigate} />
                        ))}
                      </div>
                      <p className="mt-2.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <Lightbulb className="h-3 w-3" />
                        Từ khóa thịnh hành trong tuần
                      </p>
                    </section>
                  </>
                )}
              </>
            )}

            {/* ── TYPED STATE ─────────────────────────────────────── */}
            {showTyped && (
              <>
                {loading && !hasSuggestions && !hasProducts && (
                  <p className="px-3 py-4 text-xs text-slate-400">Đang tìm kiếm...</p>
                )}

                {hasSuggestions && (
                  <section>
                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">Gợi ý tìm kiếm</p>
                    {suggestions.map((s, i) => (
                      <button
                        key={s.label}
                        id={`${listboxId}-option-${i}`}
                        role="option"
                        aria-selected={activeIdx === i}
                        type="button"
                        onClick={() => {
                          addSearchHistory(s.label, user?.id);
                          void recordSearch(s.label);
                          handleCloseDropdown();
                          router.push(s.url);
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 ${activeIdx === i ? 'bg-slate-50' : ''}`}
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 truncate">{s.label}</span>
                      </button>
                    ))}
                  </section>
                )}

                {hasProducts && (
                  <>
                    {hasSuggestions && <div className="mx-3 border-t border-slate-100" />}
                    <section>
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-500">Sản phẩm đề xuất</p>
                      {products.map((p, i) => {
                        const optIdx = suggestions.length + i;
                        return (
                          <div
                            key={p.id}
                            id={`${listboxId}-option-${optIdx}`}
                            role="option"
                            aria-selected={activeIdx === optIdx}
                            className={activeIdx === optIdx ? 'bg-slate-50' : ''}
                          >
                            <ProductRow product={p} onSelect={handleCloseDropdown} />
                          </div>
                        );
                      })}
                    </section>
                  </>
                )}

                {!loading && !hasSuggestions && !hasProducts && (
                  <div className="flex flex-col items-center gap-2 px-3 py-6">
                    <Search className="h-8 w-8 text-slate-200" />
                    <p className="text-sm text-slate-400">Không tìm thấy kết quả phù hợp</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
