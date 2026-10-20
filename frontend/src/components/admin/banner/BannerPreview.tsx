'use client';

import { ChevronRight } from 'lucide-react';
import type { Banner } from '@/types/banner.type';
import Modal from '@/components/ui/Modal';
import BannerMedia from '@/components/home/banner/BannerMedia';
import { parseBannerDisplayMeta, positionLabel } from '@/lib/banner';
import { useBannerAspectRatio } from '@/hooks/useBannerAspectRatio';

export default function BannerPreview({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const ratio = useBannerAspectRatio(banner.position);
  const { title, description, ctaLabel, showCta, targetUrl } = parseBannerDisplayMeta(banner);
  const canShowCta = showCta && Boolean(ctaLabel && targetUrl);

  return (
    <Modal title={`Xem trước: ${banner.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        {banner.group === 'MAIN' ? 'Banner chính' : 'Banner phụ'} · {positionLabel(banner.position)}
      </p>
      <div
        className="relative mx-auto w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm"
        style={{ aspectRatio: ratio, maxWidth: Math.min(680, ratio * 420) }}
      >
        <BannerMedia banner={banner} preview />
        {(title || description || canShowCta) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-3 sm:p-4 text-white">
            {title && <h4 className="line-clamp-1 text-sm sm:text-base font-bold text-white drop-shadow">{title}</h4>}
            {description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-200 drop-shadow">{description}</p>}
            {canShowCta && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
                  <span>{ctaLabel}</span>
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 break-all text-sm text-slate-500">
        {targetUrl ? `Đích điều hướng: ${targetUrl}` : 'Không có link điều hướng (Chỉ hiển thị media)'}
      </p>
    </Modal>
  );
}
