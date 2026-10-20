'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Monitor,
  Plus,
} from 'lucide-react';
import type { Banner, BannerPosition, BannerPositionSelection } from '@/types/banner.type';
import { useAuthStore } from '@/store/auth.store';
import { deleteBanner, getAdminBanners, reorderBanners, setBannerStatus } from '@/services/banner.service';
import { Skeleton } from '@/components/ui/Skeleton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import BannerLayoutPreview from './BannerLayoutPreview';
import BannerSlotRow from './BannerSlotRow';
import BannerForm from './BannerForm';
import BannerPreview from './BannerPreview';
import BannerDeleteDialog from './BannerDeleteDialog';

const STOREFRONT_POSITIONS: BannerPosition[] = [
  'MAIN_HERO',
  'SIDE_RIGHT_TOP',
  'SIDE_RIGHT_BOTTOM',
  'BOTTOM_LEFT',
  'SIDE_RIGHT_MIDDLE',
  'BOTTOM_RIGHT',
];

const SLOT_METADATA: Record<
  BannerPosition,
  { label: string; deviceLabel: string; deviceBadgeClass: string; isStorefront: boolean }
> = {
  MAIN_HERO: {
    label: 'Banner chính giữa (Hero Slider)',
    deviceLabel: 'Hiển thị: Desktop, Tablet, Mobile',
    deviceBadgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    isStorefront: true,
  },
  SIDE_RIGHT_TOP: {
    label: 'Banner phải trên',
    deviceLabel: 'Hiển thị: Desktop (≥1280px)',
    deviceBadgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    isStorefront: true,
  },
  SIDE_RIGHT_BOTTOM: {
    label: 'Banner phải dưới',
    deviceLabel: 'Hiển thị: Desktop (≥1280px)',
    deviceBadgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    isStorefront: true,
  },
  BOTTOM_LEFT: {
    label: 'Banner dưới trái',
    deviceLabel: 'Hiển thị: Desktop & Tablet',
    deviceBadgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    isStorefront: true,
  },
  SIDE_RIGHT_MIDDLE: {
    label: 'Banner dưới giữa',
    deviceLabel: 'Hiển thị: Desktop (≥1280px)',
    deviceBadgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    isStorefront: true,
  },
  BOTTOM_RIGHT: {
    label: 'Banner dưới phải',
    deviceLabel: 'Hiển thị: Desktop & Tablet',
    deviceBadgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    isStorefront: true,
  },
  SIDE_LEFT: {
    label: 'Banner dọc trái (Lưu trữ)',
    deviceLabel: 'Không hiển thị trên Storefront (Đã thay bằng Danh mục)',
    deviceBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    isStorefront: false,
  },
};

export default function BannerManager() {
  const token = useAuthStore(state => state.token);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BannerPosition>('MAIN_HERO');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{ banner?: Banner; position: BannerPositionSelection } | null>(null);
  const [preview, setPreview] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await getAdminBanners(token, signal);
        setBanners(res.banners);
      } catch (err) {
        if (!signal?.aborted) setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách banner.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const action = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
      setMessage(success);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác không thành công.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Reorder items in current slot
  const move = (banner: Banner, direction: -1 | 1) => {
    const items = banners
      .filter(item => item.position === banner.position)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const index = items.findIndex(item => item.id === banner.id);
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    void action(() => reorderBanners(token, banner.position, items.map(item => item.id)), 'Đã lưu thứ tự banner.');
  };

  // Real statistics
  const totalBanners = banners.length;
  const activeBanners = banners.filter(b => b.isActive).length;
  const inactiveBanners = banners.filter(b => !b.isActive).length;
  const usedStorefrontSlots = STOREFRONT_POSITIONS.filter(pos =>
    banners.some(b => b.position === pos && b.isActive)
  );

  // Banners in current selected slot
  const currentSlotBanners = banners
    .filter(b => b.position === selectedSlot)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const currentSlotActiveCount = currentSlotBanners.filter(b => b.isActive).length;
  const currentSlotMeta = SLOT_METADATA[selectedSlot];

  return (
    <section className="space-y-6">
      {/* 1. Header quản lý */}
      <AdminPageHeader
        title="Quản lý Banner"
        description="Quản lý hình ảnh, video và vị trí quảng cáo trên cửa hàng."
        action={
          <button
            type="button"
            onClick={() => setEditor({ position: selectedSlot })}
            disabled={busy || loading}
            className="ui-button ui-button--primary inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm Banner</span>
          </button>
        }
      />

      {/* Dải thống kê số liệu thật */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: Tổng banner */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng Banner</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{totalBanners}</span>
            <span className="text-xs text-slate-400">media</span>
          </div>
        </div>

        {/* Metric 2: Đang hoạt động */}
        <div className="rounded-xl border border-green-200/80 bg-green-50/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-green-700">Đang hoạt động</span>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-green-700">{activeBanners}</span>
            <span className="text-xs text-green-600/80">bật</span>
          </div>
        </div>

        {/* Metric 3: Đang tắt */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Đang tắt</span>
            <EyeOff className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-600">{inactiveBanners}</span>
            <span className="text-xs text-slate-400">ẩn</span>
          </div>
        </div>

        {/* Metric 4: Số vị trí Storefront đang dùng */}
        <div className="rounded-xl border border-primary-200/80 bg-primary-50/25 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary-800">Vị trí Storefront</span>
            <Monitor className="h-4 w-4 text-primary-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-primary-800">{usedStorefrontSlots.length}/6</span>
            <span className="text-xs text-primary-700">vị trí bật</span>
          </div>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {message && (
        <div
          role="status"
          className="fixed right-4 top-20 z-[110] max-w-[calc(100vw-2rem)] rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-lg"
        >
          {message}
        </div>
      )}
      {error && !deleting && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      )}
      {loadError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {loadError}{' '}
          <button onClick={() => void load()} className="font-semibold underline hover:text-red-800">
            Tải lại
          </button>
        </div>
      )}

      {/* 2. Khu vực quản lý chính: 2 cột (Layout Preview + Slot-Based Management) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* CỘT TRÁI: SƠ ĐỒ BỐ CỤC BANNER */}
        <div
          className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-all ${
            isExpandedPreview ? 'xl:col-span-12' : 'xl:col-span-6 2xl:col-span-5'
          }`}
        >
          <BannerLayoutPreview
            selectedSlot={selectedSlot}
            onSelectSlot={slot => setSelectedSlot(slot)}
            banners={banners}
            isExpanded={isExpandedPreview}
            onToggleExpand={() => setIsExpandedPreview(v => !v)}
          />
        </div>

        {/* CỘT PHẢI: DANH SÁCH MEDIA THUỘC SLOT ĐANG CHỌN */}
        <div
          className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col min-w-0 transition-all ${
            isExpandedPreview ? 'xl:col-span-12' : 'xl:col-span-6 2xl:col-span-7'
          }`}
        >
          {/* Header khu vực quản lý Slot */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
                  {currentSlotMeta?.label || selectedSlot}
                </h3>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600">
                  {selectedSlot}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-slate-600">
                  {currentSlotBanners.length} media ({currentSlotActiveCount} đang bật)
                </span>
                <span className="text-slate-300">·</span>
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium border ${currentSlotMeta?.deviceBadgeClass}`}
                >
                  {currentSlotMeta?.deviceLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || loading}
              onClick={() => setEditor({ position: selectedSlot })}
              className="ui-button ui-button--primary inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-primary-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm vào vị trí</span>
            </button>
          </div>

          {/* Danh sách các media trong Slot đang chọn */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : currentSlotBanners.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center my-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <ImagePlus className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                Chưa có media nào ở vị trí này
              </h4>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Thêm hình ảnh hoặc video cho {currentSlotMeta?.label || selectedSlot} để bắt đầu hiển thị trên giao diện cửa hàng.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditor({ position: selectedSlot })}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary-600 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Thêm banner vào vị trí này</span>
              </button>
            </div>
          ) : (
            /* Danh sách banner dạng hàng nhỏ gọn */
            <div className="space-y-2.5">
              {currentSlotBanners.map((banner, index) => (
                <BannerSlotRow
                  key={banner.id}
                  banner={banner}
                  index={index}
                  totalInSlot={currentSlotBanners.length}
                  busy={busy}
                  onPreview={() => setPreview(banner)}
                  onEdit={() => setEditor({ banner, position: banner.position })}
                  onToggle={() =>
                    void action(
                      () => setBannerStatus(token, banner.id, !banner.isActive),
                      banner.isActive ? 'Đã tắt banner.' : 'Đã bật banner.'
                    )
                  }
                  onDelete={() => {
                    setError('');
                    setDeleting(banner);
                  }}
                  onMove={direction => move(banner, direction)}
                />
              ))}
            </div>
          )}

          {/* Ghi chú slideshow nếu slot có từ 2 media trở lên */}
          {currentSlotBanners.length > 1 && (
            <p className="mt-3 text-[11px] text-slate-500">
              * Vị trí này đang chạy slideshow gồm {currentSlotBanners.length} media. Dùng các nút mũi tên để điều chỉnh thứ tự hiển thị.
            </p>
          )}
        </div>
      </div>

      {/* 3. Modal Thêm / Sửa Banner */}
      {editor && (
        <BannerForm
          key={editor.banner?.id || editor.position}
          banner={editor.banner}
          initialPosition={editor.position}
          banners={banners}
          token={token}
          onClose={() => setEditor(null)}
          onSaved={savedBanner => {
            setSelectedSlot(savedBanner.position);
            setEditor(null);
            setMessage('Đã lưu banner thành công.');
            void load();
          }}
        />
      )}

      {/* 4. Modal Xem trước Banner */}
      {preview && <BannerPreview banner={preview} onClose={() => setPreview(null)} />}

      {/* 5. Dialog Xác nhận Xóa Banner */}
      {deleting && (
        <BannerDeleteDialog
          banner={deleting}
          busy={busy}
          error={error}
          onClose={() => {
            setDeleting(null);
            setError('');
          }}
          onConfirm={() => {
            void action(() => deleteBanner(token, deleting.id), 'Đã xóa banner.').then(success => {
              if (success) setDeleting(null);
            });
          }}
        />
      )}
    </section>
  );
}
