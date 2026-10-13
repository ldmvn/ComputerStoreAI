'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ProductSpecification, ProductAttribute, ProductCustomSpecification } from '@/types/product.type';
import { mediaUrl } from '@/services/http.client';

export type SpecificationsModalProduct = {
  id: number;
  name: string;
  primaryImage: string | null;
  images?: { imageUrl: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  product: SpecificationsModalProduct;
  productAttributes?: ProductAttribute[];
  customSpecifications?: ProductCustomSpecification[];
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizedName(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

function fromAttribute(attribute: ProductAttribute): ProductSpecification[] {
  const values = (attribute.values || []).filter(hasText).map(value => value.trim());
  if (!hasText(attribute.name) || values.length === 0) return [];
  const unit = attribute.type === 'NUMBER' && hasText(attribute.unit) ? ` ${attribute.unit.trim()}` : '';
  return [{ name: attribute.name.trim(), value: `${values.join(', ')}${unit}`, sortOrder: attribute.sortOrder, source: 'ATTRIBUTE' }];
}

function fromCustom(spec: ProductCustomSpecification): ProductSpecification {
  return { id: spec.id, name: spec.name.trim(), value: spec.value.trim(), sortOrder: spec.sortOrder, source: 'CUSTOM' };
}

function SpecificationGroup({ id, title, rows, productName }: { id: string; title: string; rows: ProductSpecification[]; productName: string }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</h3>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{title} của sản phẩm {productName}</caption>
          <thead className="sr-only">
            <tr><th>Tên thông số</th><th>Giá trị</th></tr>
          </thead>
          <tbody>
            {rows.map((spec, index) => (
              <tr key={`${spec.source}-${spec.id ?? `${spec.name}-${index}`}`} className={`border-b border-slate-100 last:border-b-0 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                <th scope="row" className="w-[40%] whitespace-pre-wrap break-words px-3 py-2.5 align-top font-medium text-slate-600">{spec.name}</th>
                <td className="whitespace-pre-wrap break-words px-3 py-2.5 align-top text-slate-800">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ProductSpecificationsModal({ open, onClose, product, productAttributes, customSpecifications }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll while the modal is open
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarGap > 0) document.body.style.paddingRight = `${scrollBarGap}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  // Close on ESC, focus the close button on open, restore focus on close
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const attributeRows = (productAttributes || [])
    .flatMap(fromAttribute)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const attributeNames = new Set(attributeRows.map(spec => normalizedName(spec.name)));
  const customRows = (customSpecifications || [])
    .filter(spec => hasText(spec.name) && hasText(spec.value))
    .map(fromCustom)
    .filter(spec => !attributeNames.has(normalizedName(spec.name)))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const hasSpecifications = attributeRows.length > 0 || customRows.length > 0;

  const fallbackImage = product.primaryImage
    || product.images?.[0]?.imageUrl
    || null;
  const imageUrl = fallbackImage ? mediaUrl(fallbackImage) : null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-specifications-modal-title"
      onMouseDown={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        onMouseDown={event => event.stopPropagation()}
        className="relative flex max-h-[90dvh] w-[92vw] max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:w-[95vw]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 id="product-specifications-modal-title" className="text-lg font-semibold text-slate-900 sm:text-xl">
            Thông số kỹ thuật
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">No image</span>
            )}
          </div>
          <p className="min-w-0 break-words text-sm font-medium text-slate-800 sm:text-base">{product.name}</p>
        </div>

        <div data-testid="specifications-modal-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          {!hasSpecifications ? (
            <p className="text-sm text-slate-500">Thông số kỹ thuật đang được cập nhật.</p>
          ) : (
            <div className="space-y-6">
              {attributeRows.length > 0 && <SpecificationGroup id="standard-attributes-heading" title="Thuộc tính chuẩn" rows={attributeRows} productName={product.name} />}
              {customRows.length > 0 && <SpecificationGroup id="general-specifications-heading" title="Thông số chung" rows={customRows} productName={product.name} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
