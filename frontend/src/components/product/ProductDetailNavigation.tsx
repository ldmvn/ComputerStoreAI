'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { ClipboardList, Images, Star } from 'lucide-react';
import type { Product } from '@/types/product.type';
import { mediaUrl } from '@/services/http.client';

const items = [
  { id: 'product-gallery', label: 'Hình ảnh sản phẩm', lines: ['Hình ảnh', 'sản phẩm'], icon: Images, action: 'scroll' as const },
  { id: 'product-specifications', label: 'Thông số kỹ thuật', lines: ['Thông số', 'kỹ thuật'], icon: ClipboardList, action: 'modal' as const },
  { id: 'product-reviews', label: 'Đánh giá sản phẩm', lines: ['Đánh giá', 'sản phẩm'], icon: Star, action: 'scroll' as const },
] as const;

type Action = (typeof items)[number]['action'];

function ProductMenuImage({ product }: { product: Pick<Product, 'name' | 'primaryImage' | 'images'> }) {
  const urls = [...new Set([product.primaryImage, product.images?.[0]?.imageUrl].filter((url): url is string => Boolean(url?.trim())))];
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const url = urls.find(candidate => !failedUrls.includes(candidate));

  return url ? (
    <img key={url} src={mediaUrl(url)} alt={`Ảnh ${product.name}`} decoding="async" onError={() => setFailedUrls(previous => [...previous, url])} className="h-full w-full object-contain" />
  ) : <Images aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-slate-400 min-[360px]:h-[22px] min-[360px]:w-[22px] sm:h-6 sm:w-6" />;
}

export default function ProductDetailNavigation({ product, onOpenSpecifications }: { product: Pick<Product, 'id' | 'name' | 'primaryImage' | 'images'>; onOpenSpecifications?: () => void }) {
  const [activeId, setActiveId] = useState<string>('product-gallery');

  const handleClick = (id: string, action: Action, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (action === 'modal') {
      event.preventDefault();
      setActiveId(id);
      onOpenSpecifications?.();
      return;
    }
    const section = document.getElementById(id);
    if (!section) return;
    event.preventDefault();
    setActiveId(id);
    section.focus({ preventScroll: true });
    section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <nav aria-label="Nội dung chi tiết sản phẩm" className="rounded-2xl border border-slate-200 bg-slate-50/80 px-2 py-2.5 sm:px-3">
      <div className="flex items-center justify-center gap-1 sm:gap-3">
        {items.map(({ id, label, lines, icon: Icon, action }) => (
          <a
            key={id}
            href={action === 'modal' ? '#' : `#${id}`}
            aria-label={label}
            aria-current={activeId === id ? 'location' : undefined}
            onClick={event => handleClick(id, action, event)}
            className={`flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-center text-[11px] font-normal leading-4 transition-colors sm:min-w-[88px] sm:flex-none sm:text-xs ${activeId === id ? 'border-primary-200 bg-primary-50 text-primary-600' : 'border-transparent text-slate-600 hover:border-primary-100 hover:bg-primary-50/60 hover:text-primary-600'}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${id === 'product-gallery' ? 'border border-slate-200 bg-white p-0.5' : ''}`}>
              {id === 'product-gallery' ? <ProductMenuImage key={product.id} product={product} /> : <Icon aria-hidden="true" strokeWidth={1.75} className="h-4 w-4 min-[360px]:h-5 min-[360px]:w-5 sm:h-5 sm:w-5" />}
            </span>
            <span className="whitespace-nowrap">{lines[0]}<br />{lines[1]}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
