'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import type { Product } from '@/types/product.type';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice, productDetailHref } from '@/lib/product';
import WishlistButton from './WishlistButton';
import { useAuthModal } from '@/store/authModal.store';

const STOCK_BADGE: Record<string, { label: string; cls: string }> = {
  OUT_OF_STOCK: { label: 'Hết hàng', cls: 'bg-red-50 text-red-700' },
  LOW_STOCK:    { label: 'Sắp hết hàng', cls: 'bg-amber-50 text-amber-700' },
};

export default function CatalogProductCard({ product }: { product: Product }) {
  const openAuthModal = useAuthModal(state => state.open);

  const specs = (product.highlightSpecs ?? [])
    .filter(s => s.content.trim())
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, 3);

  const discounted =
    typeof product.originalPrice === 'number' &&
    product.originalPrice > product.price &&
    product.price >= 0;
  const discount = discounted
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const stockBadge = STOCK_BADGE[product.stockStatus];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-primary-200 hover:shadow-md hover:shadow-slate-900/[0.06]">
      {/* Image */}
      <Link href={productDetailHref(product.slug)} tabIndex={-1} aria-hidden="true">
        <div className="relative aspect-square w-full overflow-hidden bg-slate-50 p-2 sm:p-3">
          {discounted && (
            <span className="absolute left-2 top-2 z-10 rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-bold text-primary-700">
              -{discount}%
            </span>
          )}
          {product.primaryImage ? (
            <img
              src={mediaUrl(product.primaryImage)}
              alt={product.name}
              className="h-full w-full object-contain transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:-translate-y-[5px] group-hover:scale-[1.05] motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PackageOpen className="h-10 w-10 text-slate-300" aria-hidden="true" />
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-2 sm:gap-2 sm:p-3">
        {product.brandInfo && (
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {product.brandInfo.name}
          </p>
        )}

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
          <Link
            href={productDetailHref(product.slug)}
            className="hover:text-primary-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
            aria-label={`Xem chi tiết ${product.name}`}
          >
            {product.name}
          </Link>
        </h3>

        {specs.length > 0 && (
          <ul
            className="hidden flex-col gap-0.5 rounded-lg bg-slate-50 px-2.5 py-2 sm:flex"
            aria-label="Thông số nổi bật"
          >
            {specs.map((s, i) => (
              <li key={s.id ?? i} className="truncate text-[11px] leading-relaxed text-slate-500">
                • {s.content}
              </li>
            ))}
          </ul>
        )}

        {/* Pricing — pushed to bottom */}
        <div className="mt-auto flex flex-col gap-1 pt-1">
          {stockBadge && (
            <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${stockBadge.cls}`}>
              {stockBadge.label}
            </span>
          )}
          {discounted && (
            <p className="text-xs text-slate-400">
              <del>{formatProductPrice(product.originalPrice!)}</del>
            </p>
          )}
          <p className="text-sm font-bold text-primary-700 sm:text-base">{formatProductPrice(product.price)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
          <Link
            href={productDetailHref(product.slug)}
            className="flex-1 rounded-xl bg-primary-600 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
          >
            Xem sản phẩm
          </Link>
          <WishlistButton
            productId={product.id}
            productName={product.name}
            variant="compact"
            onRequireLogin={openAuthModal}
          />
        </div>
      </div>
    </article>
  );
}
