'use client';

import { ArrowDown, ArrowUp, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Banner } from '@/types/banner.type';
import BannerMedia from '@/components/home/banner/BannerMedia';
import { dateLabel, parseBannerDisplayMeta, positionLabel } from '@/lib/banner';
import { useBannerAspectRatio } from '@/hooks/useBannerAspectRatio';
import { adminActionButtonClass, adminActionGroupClass } from '@/components/admin/adminActionStyles';

export default function BannerCard({
  banner,
  busy,
  first,
  last,
  onPreview,
  onEdit,
  onToggle,
  onDelete,
  onMove,
}: {
  banner: Banner;
  busy: boolean;
  first: boolean;
  last: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const button = adminActionButtonClass;
  const ratio = useBannerAspectRatio(banner.position);
  const { title, description, ctaLabel } = parseBannerDisplayMeta(banner);

  return (
    <article className="ui-card overflow-hidden rounded-xl border border-slate-200 bg-white" data-banner-id={banner.id}>
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Xem trước ${banner.name}`}
        className="relative mx-auto block w-full overflow-hidden bg-slate-900"
        style={{ aspectRatio: ratio, maxWidth: Math.min(500, ratio * 240) }}
      >
        <BannerMedia key={banner.mediaUrl} banner={banner} thumbnail />
      </button>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="break-words font-semibold">{banner.name}</h4>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
              banner.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {banner.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {banner.mediaType === 'IMAGE' ? 'Image' : 'Video'} · {banner.group === 'MAIN' ? 'Main' : 'Side'} ·{' '}
          {banner.isAutoPlaced ? `Tự động (${positionLabel(banner.position)})` : positionLabel(banner.position)}
        </p>

        {/* Thông tin CTA và Mô tả nếu có */}
        {(ctaLabel || description) && (
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
            {description && (
              <p className="line-clamp-1">
                <span className="font-medium text-slate-700">Mô tả:</span> {description}
              </p>
            )}
            {ctaLabel && (
              <p className="flex items-center gap-1.5">
                <span className="font-medium text-slate-700">Nút CTA:</span>
                <span className="inline-flex items-center rounded bg-primary-100 px-1.5 py-0.5 font-medium text-primary-700 text-[11px]">
                  {ctaLabel}
                </span>
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500">
          Thứ tự: {banner.sortOrder}
          {!banner.isAutoPlaced && ` · Chuyển sau ${banner.autoplayInterval / 1000}s`}
        </p>
        <p className="break-all text-xs text-slate-500">Link: {banner.targetUrl || 'Không có'}</p>
        <div className="text-xs text-slate-500">
          <div>Tạo: {dateLabel(banner.createdAt)}</div>
          <div>Cập nhật: {dateLabel(banner.updatedAt)}</div>
        </div>
        <div className={adminActionGroupClass}>
          <button type="button" className={button} onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" />
            Xem trước
          </button>
          <button type="button" className={button} disabled={busy} onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Sửa
          </button>
          <button type="button" className={button} disabled={busy} onClick={onToggle}>
            {banner.isActive ? 'Tắt' : 'Bật'}
          </button>
          <button type="button" className={`${button} text-red-600`} disabled={busy} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Xóa
          </button>
          <button
            type="button"
            className={button}
            disabled={busy || first}
            onClick={() => onMove(-1)}
            aria-label={`Đưa ${banner.name} lên`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={button}
            disabled={busy || last}
            onClick={() => onMove(1)}
            aria-label={`Đưa ${banner.name} xuống`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
