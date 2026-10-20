'use client';

import { useState } from 'react';
import {
  Archive,
  Check,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  Smartphone,
  Tablet,
} from 'lucide-react';
import type { Banner, BannerPosition } from '@/types/banner.type';
import BannerMedia from '@/components/home/banner/BannerMedia';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

type BannerLayoutPreviewProps = {
  selectedSlot: BannerPosition;
  onSelectSlot: (slot: BannerPosition) => void;
  banners: Banner[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

export default function BannerLayoutPreview({
  selectedSlot,
  onSelectSlot,
  banners,
  isExpanded = false,
  onToggleExpand,
}: BannerLayoutPreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');

  // Filter banners for a specific position
  const getSlotBanners = (pos: BannerPosition) =>
    banners.filter(b => b.position === pos).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  // Render individual slot preview box
  const renderSlotBox = (
    pos: BannerPosition,
    label: string,
    className: string = 'w-full h-full',
    options?: {
      aspectRatio?: string;
      aspectLabel?: string;
    }
  ) => {
    const isSelected = selectedSlot === pos;
    const allSlotBanners = getSlotBanners(pos);
    const activeBanners = allSlotBanners.filter(b => b.isActive);
    const primaryBanner = activeBanners[0] || allSlotBanners[0];
    const hasMedia = !!primaryBanner;
    const hasMultiple = allSlotBanners.length > 1;

    return (
      <button
        type="button"
        key={pos}
        onClick={() => onSelectSlot(pos)}
        style={options?.aspectRatio ? { aspectRatio: options.aspectRatio } : undefined}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl text-left transition-all outline-none ${className} ${
          isSelected
            ? 'border-2 border-primary-500 ring-2 ring-primary-500/30 bg-primary-50/20 shadow-sm'
            : 'border border-slate-200 bg-white hover:border-primary-400 hover:shadow-xs'
        }`}
        aria-pressed={isSelected}
        aria-label={`Chọn vị trí ${label}`}
      >
        {/* Background Thumbnail if media exists */}
        {hasMedia ? (
          <div className="absolute inset-0 overflow-hidden bg-slate-950">
            <div
              className={`h-full w-full opacity-70 transition-transform duration-300 group-hover:scale-105 ${
                !primaryBanner.isActive ? 'grayscale' : ''
              }`}
            >
              <BannerMedia banner={primaryBanner} thumbnail priority />
            </div>
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/40" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-200/80 bg-slate-50/90 text-slate-400 p-2 text-center">
            <ImageIcon className="h-5 w-5 opacity-40 mb-1" />
            <span className="text-[11px] font-medium text-slate-400">Trống</span>
          </div>
        )}

        {/* Top Badges Row */}
        <div className="relative z-10 flex items-start justify-between gap-1 p-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-tight shadow-xs ${
              isSelected
                ? 'bg-primary-600 text-white'
                : hasMedia
                  ? 'bg-slate-900/85 text-white backdrop-blur-xs'
                  : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {isSelected && <Check className="h-3 w-3" />}
            <span className="truncate max-w-[130px]">{label}</span>
          </span>

          {hasMedia && (
            <div className="flex items-center gap-1">
              {primaryBanner.mediaType === 'VIDEO' && (
                <span className="inline-flex items-center rounded bg-slate-900/80 px-1 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-xs">
                  <Play className="h-2.5 w-2.5 fill-current" />
                </span>
              )}
              {hasMultiple && (
                <span className="inline-flex items-center gap-0.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur-xs">
                  <Layers className="h-2.5 w-2.5" />
                  <span>{allSlotBanners.length}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 p-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className={`font-medium ${hasMedia ? 'text-slate-200' : 'text-slate-500'}`}>
              {allSlotBanners.length > 0 ? (
                <>
                  {activeBanners.length}/{allSlotBanners.length} bật
                </>
              ) : (
                '0 media'
              )}
            </span>
            {options?.aspectLabel && (
              <span className={`text-[9px] ${hasMedia ? 'text-slate-300' : 'text-slate-400'}`}>
                {options.aspectLabel}
              </span>
            )}
          </div>
        </div>

        {/* Selected Accent Bar */}
        {isSelected && <div className="absolute inset-x-0 bottom-0 h-1 bg-primary-500" />}
      </button>
    );
  };

  const sideLeftBanners = getSlotBanners('SIDE_LEFT');
  const isSideLeftSelected = selectedSlot === 'SIDE_LEFT';

  return (
    <div className="flex flex-col gap-4">
      {/* Device Switcher & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Sơ đồ bố cục Storefront</h3>
          <p className="text-xs text-slate-500">Mô phỏng chính xác tỷ lệ Hero trang chủ DUCMANH PC</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Tabs */}
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            role="tablist"
            aria-label="Chế độ xem bố cục"
          >
            <button
              type="button"
              role="tab"
              aria-selected={device === 'desktop'}
              onClick={() => setDevice('desktop')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                device === 'desktop'
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={device === 'tablet'}
              onClick={() => setDevice('tablet')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                device === 'tablet'
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tablet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={device === 'mobile'}
              onClick={() => setDevice('mobile')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                device === 'mobile'
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Toggle Expand / Fullwidth Preview */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              title={isExpanded ? 'Thu gọn về bố cục 2 cột' : 'Mở rộng Preview kích thước lớn'}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors shadow-xs"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Thu gọn</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Xem lớn</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Visual Storefront Preview Layout */}
      <div className="space-y-2.5">
        {/* DESKTOP VIEW (≥1280px HACOM full 6-slot layout) */}
        {device === 'desktop' && (
          <div className="space-y-2.5">
            {/* HÀNG TRÊN: Chuẩn tỷ lệ Storefront 19fr (Danh mục) : 57fr (MAIN_HERO) : 24fr (2 banner phải) */}
            <div
              className="grid gap-2.5 items-stretch w-full min-w-0"
              style={{ gridTemplateColumns: 'minmax(0, 19fr) minmax(0, 57fr) minmax(0, 24fr)' }}
            >
              {/* CỘT 1: Cột danh mục sản phẩm (19% chiều rộng, không phải banner slot) */}
              <div
                className="flex flex-col justify-center items-center rounded-xl border border-slate-200 bg-slate-100/70 p-2 text-center h-full w-full min-w-0 select-none"
                title="Cột Danh Mục (Hero Sidebar) trên Storefront - 19% chiều rộng container"
              >
                <span className="text-[11px] font-semibold text-slate-700">Cột Danh Mục</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Hero Sidebar</span>
                <span className="mt-2 rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                  19%
                </span>
              </div>

              {/* CỘT 2: MAIN_HERO Slider (57% chiều rộng) - RỘNG NHẤT VÀ NỔI BẬT Ở GIỮA */}
              <div className="w-full min-w-0 h-full">
                {renderSlotBox('MAIN_HERO', 'Hero chính (Slider)', 'w-full h-full', {
                  aspectRatio: '16 / 8.8',
                  aspectLabel: '57% · 16:7',
                })}
              </div>

              {/* CỘT 3: 2 Banner dọc bên phải (24% chiều rộng) - Căn mép trên và dưới với MAIN_HERO */}
              <div className="flex flex-col gap-2 h-full w-full min-w-0">
                <div className="flex-1 min-h-0 w-full">
                  {renderSlotBox('SIDE_RIGHT_TOP', 'Phải trên', 'w-full h-full', {
                    aspectLabel: '24% · ~16:11',
                  })}
                </div>
                <div className="flex-1 min-h-0 w-full">
                  {renderSlotBox('SIDE_RIGHT_BOTTOM', 'Phải dưới', 'w-full h-full', {
                    aspectLabel: '24% · ~16:11',
                  })}
                </div>
              </div>
            </div>

            {/* HÀNG DƯỚI: Đúng 3 banner ngang bằng nhau trải toàn bộ chiều rộng Preview */}
            <div className="grid grid-cols-3 gap-2.5 w-full min-w-0">
              {renderSlotBox('BOTTOM_LEFT', 'Dưới trái', 'w-full', {
                aspectRatio: '16 / 5.5',
                aspectLabel: '16:5.5',
              })}
              {renderSlotBox('SIDE_RIGHT_MIDDLE', 'Dưới giữa', 'w-full', {
                aspectRatio: '16 / 5.5',
                aspectLabel: '16:5.5',
              })}
              {renderSlotBox('BOTTOM_RIGHT', 'Dưới phải', 'w-full', {
                aspectRatio: '16 / 5.5',
                aspectLabel: '16:5.5',
              })}
            </div>

            <p className="text-[11px] text-slate-500">
              * Tỷ lệ chuẩn HACOM Storefront: Cột danh mục (19%), Hero chính (57%), 2 Banner phải (24%), 3 Banner ngang phía dưới (16:5.5).
            </p>
          </div>
        )}

        {/* TABLET VIEW (768–1279px) */}
        {device === 'tablet' && (
          <div className="space-y-2.5">
            {/* Main Hero Slider: 16:7 trên Tablet */}
            <div className="w-full min-w-0">
              {renderSlotBox('MAIN_HERO', 'Hero chính (Slider)', 'w-full', {
                aspectRatio: '16 / 7',
                aspectLabel: 'Tablet 16:7',
              })}
            </div>

            {/* 2 Banner phụ ngang ở hàng dưới: 8:3 trên Tablet */}
            <div className="grid grid-cols-2 gap-2.5 w-full min-w-0">
              {renderSlotBox('BOTTOM_LEFT', 'Dưới trái (BOTTOM_LEFT)', 'w-full', {
                aspectRatio: '8 / 3',
                aspectLabel: '8:3',
              })}
              {renderSlotBox('BOTTOM_RIGHT', 'Dưới phải (BOTTOM_RIGHT)', 'w-full', {
                aspectRatio: '8 / 3',
                aspectLabel: '8:3',
              })}
            </div>

            <div className="rounded-lg bg-amber-50/80 p-2.5 text-[11px] text-amber-800 border border-amber-200/60">
              <p className="font-medium">Cấu hình Tablet (768–1279px):</p>
              <p className="text-amber-700 mt-0.5">
                Hiển thị MAIN_HERO và 2 banner phụ (Dưới trái, Dưới phải). Các vị trí phải và dưới giữa tự động ẩn trên Storefront.
              </p>
            </div>
          </div>
        )}

        {/* MOBILE VIEW (<768px) */}
        {device === 'mobile' && (
          <div className="space-y-2.5">
            {/* Only MAIN_HERO: Tỉ lệ 2:1 trên Mobile */}
            <div className="mx-auto max-w-sm w-full min-w-0">
              {renderSlotBox('MAIN_HERO', 'Hero chính giữa', 'w-full', {
                aspectRatio: '2 / 1',
                aspectLabel: 'Mobile 2:1',
              })}
            </div>

            <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-200">
              <p className="font-medium text-slate-700">Cấu hình Mobile (&lt;768px):</p>
              <p className="mt-0.5">
                Chỉ hiển thị MAIN_HERO slider. Tất cả các banner phụ được ẩn để tối ưu tốc độ tải và diện tích màn hình điện thoại.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nhóm vị trí chưa sử dụng / Lưu trữ (Legacy Slots) */}
      <div className="mt-2 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Archive className="h-3.5 w-3.5 text-slate-500" />
            <span>Vị trí chưa sử dụng trên Storefront</span>
          </div>
          <span className="text-[11px] text-slate-400">Dữ liệu lưu trữ</span>
        </div>

        {/* SIDE_LEFT Card */}
        <button
          type="button"
          onClick={() => onSelectSlot('SIDE_LEFT')}
          className={`w-full flex items-center justify-between rounded-xl p-3 text-left transition-all ${
            isSideLeftSelected
              ? 'border-2 border-primary-500 ring-2 ring-primary-500/30 bg-primary-50/25 shadow-xs'
              : 'border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/70'
          }`}
          aria-pressed={isSideLeftSelected}
        >
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">Banner dọc trái (SIDE_LEFT)</span>
              {isSideLeftSelected && (
                <span className="inline-flex items-center gap-0.5 rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  <Check className="h-2.5 w-2.5" />
                  Đang chọn
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Vị trí cũ đã thay thế bằng Cột danh mục. Media được lưu trữ an toàn nhưng không hiển thị trên Storefront.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-block rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
              {sideLeftBanners.length} media
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
