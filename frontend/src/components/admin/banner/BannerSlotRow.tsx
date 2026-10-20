'use client';

import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Pencil, Play, Trash2 } from 'lucide-react';
import type { Banner } from '@/types/banner.type';
import BannerMedia from '@/components/home/banner/BannerMedia';
import { parseBannerDisplayMeta } from '@/lib/banner';

type BannerSlotRowProps = {
  banner: Banner;
  index: number;
  totalInSlot: number;
  busy: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
};

export default function BannerSlotRow({
  banner,
  index,
  totalInSlot,
  busy,
  onPreview,
  onEdit,
  onToggle,
  onDelete,
  onMove,
}: BannerSlotRowProps) {
  const isFirst = index === 0;
  const isLast = index === totalInSlot - 1;
  const { title, description, ctaLabel, showCta, targetUrl } = parseBannerDisplayMeta(banner);

  return (
    <div
      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
        banner.isActive
          ? 'border-slate-200 bg-white hover:border-slate-300'
          : 'border-slate-200 bg-slate-50/60 opacity-80 hover:opacity-100'
      }`}
      data-banner-id={banner.id}
    >
      {/* Left: Thumbnail & Details */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Media Thumbnail */}
        <button
          type="button"
          onClick={onPreview}
          title="Nhấp để xem trước kích thước đầy đủ"
          className="relative h-14 w-24 sm:h-16 sm:w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <div className="h-full w-full transition-transform duration-200 group-hover:scale-105">
            <BannerMedia banner={banner} thumbnail />
          </div>
          {banner.mediaType === 'VIDEO' && (
            <span className="absolute bottom-1 right-1 rounded bg-slate-950/80 px-1 py-0.5 text-[9px] font-semibold text-amber-300 backdrop-blur-xs">
              <Play className="inline h-2 w-2 fill-current mr-0.5" />
              Video
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="h-4 w-4 text-white" />
          </div>
        </button>

        {/* Info Column */}
        <div className="min-w-0 flex-1">
          {/* Row 1: Title, Status, Type, Order */}
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="font-semibold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-[260px]" title={banner.name}>
              {banner.name}
            </h4>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                banner.isActive
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {banner.isActive ? 'Đang bật' : 'Đang tắt'}
            </span>

            {/* Media Type */}
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {banner.mediaType === 'IMAGE' ? 'Ảnh' : 'Video'}
            </span>

            {/* Order Badge */}
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              #{index + 1}
            </span>
          </div>

          {/* Row 2: Secondary Metadata (Target URL, CTA, Description, Interval) */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {targetUrl ? (
              <span className="inline-flex items-center gap-1 truncate max-w-[240px] text-primary-700 font-medium" title={targetUrl}>
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{targetUrl}</span>
              </span>
            ) : (
              <span className="text-slate-400">Không gắn link</span>
            )}

            {ctaLabel && (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium border ${
                  showCta
                    ? 'bg-primary-50 text-primary-700 border-primary-200/80 font-semibold'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
                title={showCta ? 'Nút CTA đang BẬT trên Storefront' : 'Nút CTA đang TẮT (Ẩn trên ảnh để tránh trùng lặp)'}
              >
                <span>CTA: {ctaLabel}</span>
                <span className={`text-[10px] ${showCta ? 'text-primary-800 font-bold' : 'text-slate-400'}`}>
                  ({showCta ? 'Bật' : 'Tắt'})
                </span>
              </span>
            )}

            {totalInSlot > 1 && (
              <span className="text-[11px] text-slate-400">
                · {banner.autoplayInterval / 1000}s/slide
              </span>
            )}
          </div>

          {description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500" title={description}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {/* Reorder Up / Down (if slot has multiple banners) */}
        {totalInSlot > 1 && (
          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              disabled={busy || isFirst}
              onClick={() => onMove(-1)}
              aria-label={`Chuyển ${banner.name} lên trên`}
              title="Đưa lên trước"
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <div className="h-3 w-px bg-slate-200" />
            <button
              type="button"
              disabled={busy || isLast}
              onClick={() => onMove(1)}
              aria-label={`Chuyển ${banner.name} xuống dưới`}
              title="Đưa xuống sau"
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Quick Toggle Active / Inactive */}
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          aria-label={banner.isActive ? 'Tắt banner' : 'Bật banner'}
          title={banner.isActive ? 'Tắt hiển thị' : 'Bật hiển thị'}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
            banner.isActive
              ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
              : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {banner.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{banner.isActive ? 'Bật' : 'Tắt'}</span>
        </button>

        {/* Edit Button */}
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          aria-label={`Chỉnh sửa ${banner.name}`}
          title="Chỉnh sửa banner"
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {/* Delete Button */}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          aria-label={`Xóa ${banner.name}`}
          title="Xóa banner"
          className="rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
