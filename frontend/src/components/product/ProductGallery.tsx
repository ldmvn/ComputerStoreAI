'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, PackageOpen } from 'lucide-react';
import type { ProductImage } from '@/types/product.type';
import { mediaUrl } from '@/services/http.client';

function GalleryImage({ url, alt, className }: { url: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <span className="flex h-full w-full items-center justify-center text-slate-300" role="img" aria-label="Ảnh không khả dụng">
      <ImageOff size={32} aria-hidden="true" />
    </span>
  );
  return <img src={mediaUrl(url)} alt={alt} className={className} onError={() => setFailed(true)} decoding="async" />;
}

export default function ProductGallery({ name, images, primaryImage }: {
  name: string;
  images: ProductImage[];
  primaryImage: string | null;
}) {
  const photos = [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder || a.id - b.id);
  const count = photos.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const thumbListRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const selected = photos[activeIndex] ?? null;
  const url = selected?.imageUrl ?? primaryImage;

  // Scroll active thumbnail into view when navigating with arrows
  useEffect(() => {
    const list = thumbListRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  const go = useCallback((delta: number) => {
    if (count < 2) return;
    setActiveIndex(i => (i + delta + count) % count);
  }, [count]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  }, [go]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? 1 : -1);
  };

  const navBtnCls = [
    'absolute top-1/2 -translate-y-1/2 z-10',
    'flex h-9 w-9 items-center justify-center rounded-full',
    'border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm',
    'transition-all motion-reduce:transition-none',
    'hover:border-slate-300 hover:bg-white hover:text-[#C4480A]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4480A]',
  ].join(' ');

  return (
    <section
      aria-label="Ảnh sản phẩm"
      aria-roledescription="carousel"
      className="min-w-0 rounded-2xl bg-white p-3 sm:p-4"
      onKeyDown={count > 1 ? handleKeyDown : undefined}
      tabIndex={count > 1 ? 0 : undefined}
    >
      {/* Desktop: flex-row (thumbnails left | main right)  Mobile: flex-col (main top | thumbnails below) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">

        {/* Thumbnail strip — bottom on mobile, left column on desktop */}
        {count > 1 && (
          <div
            ref={thumbListRef}
            role="tablist"
            aria-label="Chọn ảnh sản phẩm"
            className={[
              // mobile: horizontal row, pushed below main image via order-last
              'order-last flex flex-row gap-1.5 overflow-x-auto pb-1',
              // desktop: vertical column, scrollable
              'sm:order-first sm:w-[72px] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto',
              'sm:max-h-[480px] sm:pb-0',
              // subtle scrollbar
              '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200',
            ].join(' ')}
          >
            {photos.map((image, i) => (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-label={`Ảnh ${i + 1}${image.altText ? `: ${image.altText}` : ''}`}
                aria-selected={activeIndex === i}
                onClick={() => setActiveIndex(i)}
                className={[
                  'flex shrink-0 h-14 w-14 sm:h-[60px] sm:w-[60px] items-center justify-center',
                  'overflow-hidden rounded-lg border-2 bg-white p-1',
                  'transition-colors motion-reduce:transition-none',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4480A]',
                  activeIndex === i
                    ? 'border-[#C4480A]'
                    : 'border-slate-200 hover:border-orange-300',
                ].join(' ')}
              >
                <GalleryImage
                  url={image.imageUrl}
                  alt={image.altText || `${name} ảnh ${i + 1}`}
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="min-w-0 flex-1">
          <div
            className="relative aspect-[4/3] max-h-[480px] w-full overflow-hidden"
            data-testid="product-main-image"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
              {url
                ? <GalleryImage key={url} url={url} alt={selected?.altText || name} className="h-full w-full object-contain" />
                : (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <PackageOpen size={64} strokeWidth={1} aria-hidden="true" />
                    <p className="text-sm">Chưa có ảnh sản phẩm</p>
                  </div>
                )
              }
            </div>

            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước" className={`${navBtnCls} left-2`}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Ảnh tiếp theo" className={`${navBtnCls} right-2`}>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white tabular-nums backdrop-blur-sm select-none"
                >
                  {activeIndex + 1} / {count}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
