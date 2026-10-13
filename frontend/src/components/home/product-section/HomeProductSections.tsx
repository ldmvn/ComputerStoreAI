'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getHomeProductSections } from '@/services/productSection.service';
import type { ProductSection } from '@/types/productSection.type';
import ProductCard from './ProductCard';
import styles from './HomeProductSections.module.css';

export default function HomeProductSections() {
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getHomeProductSections(controller.signal)
      .then(result => { if (!controller.signal.aborted) { setSections(result.sections); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => controller.abort();
  }, [retry]);

  const visibleSections = sections.filter(section => section.products.length > 0);
  if (loaded && error) return (
    <div className="container mx-auto px-3 pb-8 lg:px-4" role="status">
      Không tải được sản phẩm. Vui lòng kiểm tra kết nối máy chủ.{' '}
      <button type="button" className="ui-link font-medium text-primary-600 hover:underline" onClick={() => { setLoaded(false); setRetry(value => value + 1); }}>Thử lại</button>
    </div>
  );
  if (loaded && !visibleSections.length) return null;

  return (
    <div className={`container mx-auto px-3 pb-4 lg:px-4 sm:pb-10 ${styles.sections}`} aria-busy={!loaded}>
      {!loaded ? (
        <div role="status" className={styles.section}>
          <span className="sr-only">Đang tải sản phẩm</span>
          <div aria-hidden="true">
            <div className={styles.header}><div className={`skeleton-shimmer ${styles.skeletonTitle}`} /></div>
            <div className={styles.grid}>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className={styles.card}>
                  <div className={`skeleton-shimmer ${styles.image}`} />
                  <div className={`skeleton-shimmer ${styles.skeletonName}`} />
                  <div className={`skeleton-shimmer ${styles.skeletonPrice}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : visibleSections.map(section => (
        <section key={section.id} className={styles.section} aria-labelledby={`home-products-${section.id}`}>
          <div className={styles.header}>
            <div className={styles.heading}>
              <h2 id={`home-products-${section.id}`} className={styles.title}>{section.name}</h2>
              {section.subtitle && <p className={styles.subtitle}>{section.subtitle}</p>}
            </div>
            {section.viewAllUrl && (
              <Link href={section.viewAllUrl} className={styles.viewAll}>
                Xem tất cả <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className={styles.grid}>
            {section.products.slice(0, 6).map(product => (
              <ProductCard key={product.id} product={product} showHighlightSpecs={section.showHighlightSpecs} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
