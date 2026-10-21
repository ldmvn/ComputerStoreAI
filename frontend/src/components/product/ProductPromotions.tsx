'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { ChevronDown, Gift, ExternalLink } from 'lucide-react';
import type { ProductPromotion } from '@/types/product.type';
import { formatProductPrice } from '@/lib/product';
import { mediaUrl } from '@/services/http.client';

function fmtEndDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function PromotionAccordionItem({ promo, index, defaultOpen }: { promo: ProductPromotion; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const endDate = fmtEndDate(promo.endAt);
  const panelId = `product-promotion-panel-${promo.id}`;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50 sm:px-5"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-primary-700 sm:text-base">{promo.displayTitle}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-primary-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="bg-white px-4 pb-4 pl-[2.75rem] pr-4 sm:px-5 sm:pl-[3.25rem]">
          {promo.description && <p className="text-sm leading-relaxed text-slate-600">{promo.description}</p>}
          {promo.conditionText && <p className="mt-1.5 text-xs text-slate-500">Điều kiện: {promo.conditionText}</p>}
          {endDate && <p className="mt-1 text-xs text-slate-400">Áp dụng đến hết {endDate}</p>}

          {promo.gift && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-lg bg-slate-50 p-2">
              {promo.gift.imageUrl ? (
                <img src={mediaUrl(promo.gift.imageUrl)} alt={promo.gift.name} className="h-10 w-10 shrink-0 rounded-md border border-slate-100 bg-white object-contain" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-slate-300"><Gift className="h-4 w-4" aria-hidden="true" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{promo.gift.name}</p>
                <p className="text-xs text-slate-400">
                  {promo.gift.quantity ? `Số lượng: ${promo.gift.quantity}` : null}
                  {promo.gift.quantity && promo.gift.price ? ' · ' : null}
                  {promo.gift.price ? `Giá tham khảo ${formatProductPrice(promo.gift.price)}` : null}
                </p>
              </div>
            </div>
          )}

          {promo.detailUrl && (
            <a href={promo.detailUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
              Xem chi tiết <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductPromotions({ promotions }: { promotions?: ProductPromotion[] }) {
  const items = promotions || [];
  if (!items.length) return null;

  return (
    <section id="product-promotions" aria-labelledby="product-promotions-heading" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 bg-primary-600 px-4 py-3 sm:px-5">
        <Gift className="h-5 w-5 text-white" aria-hidden="true" />
        <h2 id="product-promotions-heading" className="text-sm font-extrabold uppercase tracking-wide text-white sm:text-base">
          Khuyến mãi &amp; Quà tặng
        </h2>
      </div>
      <div>
        {items.map((promo, index) => (
          <PromotionAccordionItem key={promo.id} promo={promo} index={index} defaultOpen={index === 0} />
        ))}
      </div>
    </section>
  );
}
