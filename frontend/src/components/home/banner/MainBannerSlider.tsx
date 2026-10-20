'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@/types/banner.type';
import { parseBannerDisplayMeta, safeBannerTarget } from '@/lib/banner';
import BannerMedia from './BannerMedia';
import styles from './MainBannerSlider.module.css';

export default function MainBannerSlider({ banners, label, compact = false }: { banners: Banner[]; label: string; compact?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touching, setTouching] = useState(false);
  const gesture = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const suppressClick = useRef(false);
  const safeIndex = banners.length ? Math.min(currentIndex, banners.length - 1) : 0;
  const active = banners[safeIndex];
  const multiple = banners.length > 1;

  useEffect(() => {
    if (currentIndex >= banners.length) setCurrentIndex(0);
  }, [banners.length, currentIndex]);

  useEffect(() => {
    if (!multiple) return;
    const delay = active.autoplayInterval || 4500;
    const timer = window.setInterval(() => {
      setCurrentIndex(value => (value + 1) % banners.length);
    }, delay);
    return () => window.clearInterval(timer);
  }, [active.autoplayInterval, banners.length, multiple, safeIndex]);

  if (!active) return null;

  const target = safeBannerTarget(active.targetUrl);
  const { title, description, ctaLabel, showCta } = parseBannerDisplayMeta(active);
  const canShowCta = showCta && Boolean(ctaLabel && target);
  const hasOverlay = canShowCta || Boolean(title || description);

  const media = <BannerMedia key={active.mediaUrl} banner={active} priority={label === 'Giữa - Trên'} />;

  const overlay = hasOverlay ? (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent text-white ${
        compact ? 'p-2.5 pb-2.5' : 'p-4 sm:p-6 pb-6 sm:pb-8'
      }`}
    >
      <div className="flex flex-col items-start gap-1 max-w-xl">
        {title && (
          <h3
            className={`font-bold text-white drop-shadow-md line-clamp-1 ${
              compact ? 'text-xs' : 'text-sm sm:text-lg'
            }`}
          >
            {title}
          </h3>
        )}
        {description && (
          <p
            className={`text-slate-200 drop-shadow line-clamp-1 ${
              compact ? 'text-[11px]' : 'text-xs sm:text-sm'
            }`}
          >
            {description}
          </p>
        )}
        {canShowCta && (
          <div className="mt-1.5 sm:mt-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg bg-primary-600 font-semibold text-white shadow-md transition-all duration-200 group-hover:bg-primary-500 group-hover:shadow-lg ${
                compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
              }`}
            >
              <span>{ctaLabel}</span>
              <ChevronRight
                className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
                  compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
                }`}
              />
            </span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`absolute inset-0 ${styles.touchSlider} ${compact ? styles.compact : ''}`} role="region" aria-roledescription="carousel" aria-label={label}
      onPointerDown={event => {
        suppressClick.current = false;
        if (!multiple || event.pointerType !== 'touch' || window.innerWidth >= 1024 || (event.target as HTMLElement).closest('button')) return;
        if (gesture.current) { gesture.current = null; setTouching(false); return; }
        gesture.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
        setTouching(true);
      }}
      onPointerUp={event => {
        const start = gesture.current;
        if (!start || start.pointerId !== event.pointerId) return;
        gesture.current = null; setTouching(false);
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        suppressClick.current = true;
        setCurrentIndex(value => (value + (dx < 0 ? 1 : -1) + banners.length) % banners.length);
      }}
      onPointerCancel={() => { gesture.current = null; setTouching(false); }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      <div key={active.id} className={`absolute inset-0 ${multiple ? styles.slide : ''}`} role="group" aria-roledescription="slide" aria-label={`${safeIndex + 1} / ${banners.length}: ${active.name}`}>
        {target ? (
          <Link href={target} className="absolute inset-0 group" aria-label={active.altText || active.name}>
            {media}
            {overlay}
          </Link>
        ) : (
          <div className="absolute inset-0 group">
            {media}
            {overlay}
          </div>
        )}
      </div>
      {multiple && <>
        <button type="button" aria-label={`${label}: banner trước`} onClick={() => setCurrentIndex(value => (value - 1 + banners.length) % banners.length)} className={`absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/50 text-white hover:bg-slate-950/70 ${styles.arrow}`}><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" aria-label={`${label}: banner tiếp theo`} onClick={() => setCurrentIndex(value => (value + 1) % banners.length)} className={`absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/50 text-white hover:bg-slate-950/70 ${styles.arrow}`}><ChevronRight className="h-5 w-5" /></button>
        <div className={`absolute bottom-3 left-1/2 z-10 flex max-w-[70%] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-slate-950/50 px-2 py-1 ${styles.pagination}`}>
          {banners.map((banner, slide) => <button key={banner.id} type="button" onClick={() => setCurrentIndex(slide)} aria-label={`${label}: chọn banner ${slide + 1}`} aria-current={slide === safeIndex ? 'true' : undefined} className={`flex h-6 w-6 shrink-0 items-center justify-center ${styles.dotButton}`}><span className={`h-2 rounded-full transition-all ${slide === safeIndex ? 'w-5 bg-white' : 'w-2 bg-white/50'}`} /></button>)}
        </div>
      </>}
    </div>
  );
}
