'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getHomeProductSections } from '@/services/productSection.service';
import type { ProductSection, QuickFilterTab } from '@/types/productSection.type';
import ProductCard from './ProductCard';
import PromotionalSection from './PromotionalSection';
import styles from './HomeProductSections.module.css';

function buildTabUrl(section: ProductSection, tab: QuickFilterTab): string {
  const params = new URLSearchParams({ section: section.slug });
  if (tab.filterType === 'BRAND') {
    if (tab.brandSlug) params.set('brand', tab.brandSlug);
    else if (tab.brandId != null) params.set('brandId', String(tab.brandId));
  } else if (tab.filterType === 'CATEGORY') {
    if (tab.categorySlug) params.set('category', tab.categorySlug);
  } else if (tab.filterType === 'ATTRIBUTE') {
    if (tab.attributeSlug && tab.attributeValueId != null) {
      params.set(`attr[${tab.attributeSlug}]`, String(tab.attributeValueId));
    }
  }
  return `/customer/products?${params.toString()}`;
}

function SectionHeader({ section }: { section: ProductSection }) {
  const cfg = section.quickFilterConfig;
  const tabs = cfg?.enabled && cfg.tabs.length > 0 ? cfg.tabs : null;

  if (!tabs) {
    return (
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
    );
  }

  return (
    <div className={styles.headerWithTabs}>
      <div className={styles.heading}>
        <h2 id={`home-products-${section.id}`} className={styles.title}>{section.name}</h2>
        {section.subtitle && <p className={styles.subtitle}>{section.subtitle}</p>}
      </div>
      <nav className={styles.tabsBar} aria-label={`Bộ lọc nhanh ${section.name}`}>
        {tabs.map(tab => (
          <Link key={tab.id} href={buildTabUrl(section, tab)} className={styles.qfLink}>
            {tab.label}
          </Link>
        ))}
      </nav>
      {section.viewAllUrl && (
        <Link href={section.viewAllUrl} className={styles.viewAll}>
          Xem tất cả <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

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

  const visibleSections = sections.filter(s =>
    s.type === 'PROMOTIONAL_SECTION' || s.products.length > 0
  );

  if (loaded && error) return (
    <div className="container mx-auto px-3 pb-8 lg:px-4" role="status">
      Không tải được sản phẩm. Vui lòng kiểm tra kết nối máy chủ.{' '}
      <button type="button" className="ui-link font-medium text-primary-600 hover:underline" onClick={() => { setLoaded(false); setRetry(v => v + 1); }}>Thử lại</button>
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
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={styles.card}>
                  <div className={`skeleton-shimmer ${styles.image}`} />
                  <div className={`skeleton-shimmer ${styles.skeletonName}`} />
                  <div className={`skeleton-shimmer ${styles.skeletonPrice}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : visibleSections.map(section => (
        section.type === 'PROMOTIONAL_SECTION' ? (
          <div key={section.id} aria-label={section.promoTitle || section.name}>
            <PromotionalSection section={section} />
          </div>
        ) : (
          <section key={section.id} className={styles.section} aria-labelledby={`home-products-${section.id}`}>
            <SectionHeader section={section} />
            <div className={styles.grid}>
              {section.products.slice(0, 6).map(product => (
                <ProductCard key={product.id} product={product} showHighlightSpecs={section.showHighlightSpecs} />
              ))}
            </div>
          </section>
        )
      ))}
    </div>
  );
}
