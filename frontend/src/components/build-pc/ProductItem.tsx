'use client';

import { Check } from 'lucide-react';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice } from '@/lib/product';
import type { BuildPcProduct } from '@/types/buildPc.type';

type Props = {
  product: BuildPcProduct;
  isSelected: boolean;
  onSelect: (product: BuildPcProduct) => void;
};

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100">
      <svg viewBox="0 0 48 48" className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="6" y="6" width="36" height="36" rx="4" />
        <circle cx="18" cy="18" r="4" />
        <path d="M6 32 l10-10 8 8 6-6 12 12" />
      </svg>
    </div>
  );
}

export default function ProductItem({ product, isSelected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`group relative flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-[#C4480A] hover:bg-orange-50/40 ${
        isSelected
          ? 'border-[#C4480A] bg-orange-50/60'
          : product.inStock
          ? 'border-slate-200 bg-white'
          : 'border-slate-200 bg-slate-50 opacity-70'
      }`}
      aria-pressed={isSelected}
    >
      {/* Image */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
        {product.primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(product.primaryImage)}
            alt={product.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-slate-800 leading-snug">{product.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {product.brand && (
            <span className="text-xs text-slate-500">{product.brand.name}</span>
          )}
          {product.warranty && (
            <span className="text-xs text-slate-400">· BH {product.warranty}</span>
          )}
          {product.compat === 'unknown' && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              Chưa đủ dữ liệu tương thích
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#C4480A]">{formatProductPrice(product.price)}</span>
          {!product.inStock && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Hết hàng</span>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#C4480A]">
          <Check size={11} strokeWidth={3} className="text-white" />
        </span>
      )}
    </button>
  );
}
