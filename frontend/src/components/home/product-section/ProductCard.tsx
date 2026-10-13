/* eslint-disable @next/next/no-img-element */

import { Gift, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import type { SectionProduct } from '@/types/productSection.type';
import type { Product } from '@/types/product.type';
import { mediaUrl } from '@/services/http.client';
import styles from './HomeProductSections.module.css';
import { formatProductPrice as formatPrice, productDetailHref } from '@/lib/product';

type CardProduct = SectionProduct & Partial<Pick<Product, 'images'>> & {
  promotion?: string | null;
};

const HIGHLIGHT_LIMIT = 3;

export default function ProductCard({ product, showHighlightSpecs = true }: { product: CardProduct; showHighlightSpecs?: boolean }) {
  const highlightSpecs = showHighlightSpecs
    ? (product.highlightSpecs || [])
        .filter(spec => spec.content.trim())
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .slice(0, HIGHLIGHT_LIMIT)
    : [];
  const originalPrice = product.originalPrice;
  const discounted = typeof originalPrice === 'number' && originalPrice > product.price && product.price >= 0;
  const discount = discounted ? Math.round((originalPrice - product.price) / originalPrice * 100) : 0;
  const image = product.primaryImage || product.images?.find(item => item.isPrimary)?.imageUrl || product.images?.[0]?.imageUrl;

  return (
    <article className={`${styles.card} ${styles.productCard} ${highlightSpecs.length ? styles.withSpecifications : ''}`}>
      <div className={styles.productImage}>
        {image ? (
          <img src={mediaUrl(image)} alt={product.name} loading="lazy" decoding="async" />
        ) : <PackageOpen size={40} aria-hidden="true" />}
      </div>
      <div className={styles.productContent}>
        <h3 className={showHighlightSpecs ? styles.productName : styles.productNameExpanded} title={product.name}>{product.slug ? <Link href={productDetailHref(product.slug)} className={styles.productLink} aria-label={`Xem chi tiết ${product.name}`}>{product.name}</Link> : product.name}</h3>
        {highlightSpecs.length > 0 && (
          <ul className={styles.specifications} aria-label="Thông số nổi bật">
            {highlightSpecs.map((spec, index) => (
              <li key={spec.id ?? `highlight-${index}`} title={spec.content}>
                <span>{spec.content}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.pricing}>
          {discounted && (
            <div className={styles.originalPrice}>
              <span className="sr-only">Giá gốc </span><del>{formatPrice(originalPrice)}</del>
              {discount >= 1 && <span className={styles.discountPercent}>Tiết kiệm {discount}%</span>}
            </div>
          )}
          <p className={styles.price}><span className="sr-only">Giá bán </span>{formatPrice(product.price)}</p>
        </div>
        {product.promotion?.trim() && (
          <div className={styles.promotion}>
            <Gift size={15} aria-hidden="true" /><p title={product.promotion}>{product.promotion}</p>
          </div>
        )}
      </div>
    </article>
  );
}
