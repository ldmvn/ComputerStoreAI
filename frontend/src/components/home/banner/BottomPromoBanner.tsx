'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Banner } from '@/types/banner.type';
import { parseBannerDisplayMeta } from '@/lib/banner';
import BannerMedia from './BannerMedia';

export default function BottomPromoBanner({
  banners,
  label,
}: {
  banners: Banner[];
  label: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeIndex = banners.length ? Math.min(currentIndex, banners.length - 1) : 0;
  const active = banners[safeIndex];
  const multiple = banners.length > 1;

  useEffect(() => {
    if (currentIndex >= banners.length) setCurrentIndex(0);
  }, [banners.length, currentIndex]);

  useEffect(() => {
    if (!multiple || !active) return;
    const delay = active.autoplayInterval || 5000;
    const timer = window.setInterval(() => {
      setCurrentIndex(value => (value + 1) % banners.length);
    }, delay);
    return () => window.clearInterval(timer);
  }, [active, banners.length, multiple]);

  if (!active) return null;

  const { title, description, ctaLabel, showCta, targetUrl } = parseBannerDisplayMeta(active);
  const canShowCta = showCta && Boolean(ctaLabel && targetUrl);
  const hasOverlay = Boolean(title || description || canShowCta);

  const content = (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900 group shadow-sm transition-all duration-300 hover:border-primary-300 hover:shadow-md">
      {/* Media Background */}
      <div className="absolute inset-0 h-full w-full overflow-hidden transition-transform duration-500 ease-out group-hover:scale-105">
        <BannerMedia banner={active} fit="cover" />
      </div>

      {/* Gradient & Text Overlay */}
      {hasOverlay && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-3 sm:p-3.5 text-white">
          <div className="min-w-0 flex-1 flex flex-col justify-end">
            {title && (
              <h3 className="line-clamp-1 text-xs font-bold tracking-tight text-white drop-shadow sm:text-sm">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-200 drop-shadow sm:text-xs">
                {description}
              </p>
            )}
            {canShowCta && (
              <div className="mt-2 flex items-center">
                <span className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 group-hover:bg-primary-500 sm:text-xs">
                  <span>{ctaLabel}</span>
                  <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carousel dots if multiple banners in this slot */}
      {multiple && (
        <div
          className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-slate-950/60 px-1.5 py-0.5 backdrop-blur-sm"
          role="tablist"
          aria-label={`${label}: chuyển banner`}
        >
          {banners.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              aria-label={`${label}: banner ${idx + 1}`}
              aria-current={idx === safeIndex ? 'true' : undefined}
              className="flex h-3 w-3 items-center justify-center"
            >
              <span
                className={`h-1.5 rounded-full transition-all ${
                  idx === safeIndex ? 'w-3.5 bg-primary-500' : 'w-1.5 bg-white/60'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // If a valid targetUrl exists, wrap in a single semantic Link with no nested click handlers
  if (targetUrl) {
    return (
      <Link
        href={targetUrl}
        className="block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl"
        aria-label={title || active.altText || ctaLabel || active.name}
      >
        {content}
      </Link>
    );
  }

  return content;
}
