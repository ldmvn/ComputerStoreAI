'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SectionProduct } from '@/types/productSection.type';
import ProductCard from './ProductCard';
import styles from './HomeProductSections.module.css';

export default function ProductSectionCarousel({ products, label, showHighlightSpecs = true }: { products: SectionProduct[]; label: string; showHighlightSpecs?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ overflow: false, atStart: true, atEnd: true });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const next = { overflow: maxScroll > 1, atStart: track.scrollLeft <= 1, atEnd: track.scrollLeft >= maxScroll - 1 };
      setScroll(previous => previous.overflow === next.overflow && previous.atStart === next.atStart && previous.atEnd === next.atEnd ? previous : next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    if (track.firstElementChild) observer.observe(track.firstElementChild);
    track.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); track.removeEventListener('scroll', update); };
  }, [products.length]);

  const move = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <div className={styles.carousel}>
      <div ref={trackRef} className={styles.track} role="region" aria-label={`Sản phẩm ${label}`} tabIndex={scroll.overflow ? 0 : undefined}>
        {products.map(product => <ProductCard key={product.id} product={product} showHighlightSpecs={showHighlightSpecs} />)}
      </div>
      {scroll.overflow && <>
        <button type="button" className={`${styles.arrow} ${styles.previous}`} aria-label={`Sản phẩm trước trong ${label}`} disabled={scroll.atStart} onClick={() => move(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label={`Sản phẩm tiếp theo trong ${label}`} disabled={scroll.atEnd} onClick={() => move(1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </>}
    </div>
  );
}
