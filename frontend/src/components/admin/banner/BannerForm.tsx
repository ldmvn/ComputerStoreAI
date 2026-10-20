'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, FileText, Globe, Image as ImageIcon, Info, Play, Sliders, Upload } from 'lucide-react';
import type { Banner, BannerGroup, BannerPosition, BannerPositionSelection, MediaType } from '@/types/banner.type';
import { AUTO_SIDE_ORDER, BANNER_POSITIONS, IMAGE_LIMIT, VIDEO_LIMIT, bannerRecommendation, formatBannerAltText, parseBannerDisplayMeta } from '@/lib/banner';
import { mediaUrl } from '@/services/http.client';
import { saveBanner } from '@/services/banner.service';
import Modal from '@/components/ui/Modal';
import BannerMedia from '@/components/home/banner/BannerMedia';
import { useBannerAspectRatio } from '@/hooks/useBannerAspectRatio';

const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-600';

const FILTER_SUGGESTIONS = [
  { label: 'Danh mục PC', url: '/customer/products?category=pc' },
  { label: 'Danh mục VGA', url: '/customer/products?category=vga' },
  { label: 'Danh mục CPU', url: '/customer/products?category=cpu' },
  { label: 'Khối PC Gaming', url: '/customer/products?section=pc-gaming' },
  { label: 'Khối Mainboard', url: '/customer/products?section=mainboard' },
  { label: 'Khối VGA', url: '/customer/products?section=vga' },
  { label: 'Khối CPU', url: '/customer/products?section=cpu' },
  { label: 'Brand ASUS', url: '/customer/products?brand=asus' },
  { label: 'Brand MSI', url: '/customer/products?brand=msi' },
  { label: 'Brand Gigabyte', url: '/customer/products?brand=gigabyte' },
];

export default function BannerForm({
  banner,
  initialPosition = 'MAIN_HERO',
  banners,
  token,
  onClose,
  onSaved,
}: {
  banner?: Banner;
  initialPosition?: BannerPositionSelection;
  banners: Banner[];
  token: string | null;
  onClose: () => void;
  onSaved: (banner: Banner) => void;
}) {
  const [name, setName] = useState(banner?.name || '');
  const [position, setPosition] = useState<BannerPositionSelection>(
    banner?.isAutoPlaced ? 'AUTO' : banner?.position || initialPosition
  );
  const [group, setGroup] = useState<BannerGroup>(
    banner?.group || (position === 'MAIN_HERO' ? 'MAIN' : 'SIDE')
  );
  const [mediaType, setMediaType] = useState<MediaType>(banner?.mediaType || 'IMAGE');
  const [targetUrl, setTargetUrl] = useState(banner?.targetUrl || '');

  // Phân tích altText hiện có thành Mô tả ngắn, Nhãn CTA và cờ Bật/Tắt nút CTA
  const initialParsed = parseBannerDisplayMeta({
    name: banner?.name,
    altText: banner?.altText,
    targetUrl: banner?.targetUrl,
  });
  const [description, setDescription] = useState(initialParsed.description);
  const [ctaLabel, setCtaLabel] = useState(initialParsed.ctaLabel);
  const [showCta, setShowCta] = useState(initialParsed.showCta);

  const [sortOrder, setSortOrder] = useState(banner?.sortOrder || 0);
  const [seconds, setSeconds] = useState((banner?.autoplayInterval || 4500) / 1000);
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [invalid, setInvalid] = useState(false);

  // Sync group when position changes
  const handlePositionChange = (newPos: BannerPositionSelection) => {
    setPosition(newPos);
    setGroup(newPos === 'MAIN_HERO' ? 'MAIN' : 'SIDE');
    setError('');
  };

  const occupied = banners.filter(item => item.group === 'SIDE' && item.isActive && item.id !== banner?.id);
  const autoOrder = banner?.group === 'SIDE' ? [banner.position, ...AUTO_SIDE_ORDER] : AUTO_SIDE_ORDER;
  const automaticPosition = autoOrder.find(candidate => !occupied.some(item => item.position === candidate));
  const previewPosition = position === 'AUTO' ? automaticPosition || 'BOTTOM_LEFT' : position;
  const ratio = useBannerAspectRatio(previewPosition);

  useEffect(() => {
    setDimensions(null);
    setInvalid(false);
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resetFile = () => {
    setFile(null);
    setFileKey(value => value + 1);
    setError('');
  };

  const chooseFile = (selected: File | undefined) => {
    setError('');
    setFile(null);
    if (!selected) return;
    if (!selected.size) {
      setError('File media rỗng. Vui lòng chọn file khác.');
      setFileKey(value => value + 1);
      return;
    }
    const types = mediaType === 'IMAGE' ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm'];
    const extension = mediaType === 'IMAGE' ? /\.(jpe?g|png|webp)$/i : /\.(mp4|webm)$/i;
    if (!types.includes(selected.type) || !extension.test(selected.name)) {
      setError('Định dạng/MIME không đúng loại media đã chọn.');
      setFileKey(value => value + 1);
      return;
    }
    if (selected.size > (mediaType === 'IMAGE' ? IMAGE_LIMIT : VIDEO_LIMIT)) {
      setError(mediaType === 'IMAGE' ? 'Ảnh tối đa 10 MB.' : 'Video tối đa 50 MB.');
      setFileKey(value => value + 1);
      return;
    }
    setFile(selected);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (file && invalid) {
      setError('Không thể đọc media đã chọn. Vui lòng chọn file hợp lệ.');
      return;
    }
    if (!file && (!banner || banner.mediaType !== mediaType)) {
      setError('Vui lòng chọn media phù hợp trước khi lưu.');
      return;
    }

    // Đóng gói altText chuẩn lưu trữ: mô tả ngắn, nhãn CTA và cờ SHOW_CTA
    const combinedAlt = formatBannerAltText({ description, ctaLabel, showCta });

    const body = new FormData();
    for (const [key, value] of Object.entries({
      name,
      group,
      position,
      mediaType,
      targetUrl,
      altText: combinedAlt,
      sortOrder,
      autoplayInterval: Math.round(seconds * 1000),
      isActive,
    })) {
      body.set(key, String(value));
    }
    if (file) body.set('media', file);

    setBusy(true);
    try {
      const result = await saveBanner(token, body, banner?.id);
      onSaved(result.banner);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể lưu banner.');
    } finally {
      setBusy(false);
    }
  };

  const source = preview || (banner && banner.mediaType === mediaType ? mediaUrl(banner.mediaUrl) : '');
  const effectiveCta = showCta && ctaLabel.trim() ? ctaLabel.trim() : '';

  return (
    <Modal
      title={banner ? `Sửa banner: ${banner.name}` : 'Thêm banner mới'}
      onClose={onClose}
      busy={busy}
      size="lg"
      scrollableBody
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {busy ? 'Đang upload và lưu dữ liệu…' : 'Kiểm tra thông tin trước khi nhấn lưu'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="ui-button ui-button--neutral rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="banner-edit-form"
              disabled={busy || (position === 'AUTO' && !automaticPosition)}
              className="ui-button ui-button--primary rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? 'Đang lưu…' : banner ? 'Cập nhật banner' : 'Lưu banner'}
            </button>
          </div>
        </div>
      }
    >
      <form id="banner-edit-form" onSubmit={submit} className="space-y-6">
        {position === 'AUTO' && (
          <div role="status" className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-800">
            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              {automaticPosition ? (
                <>
                  <p className="font-semibold">Vị trí dự kiến: {BANNER_POSITIONS.find(item => item.position === automaticPosition)?.label}</p>
                  <p className="mt-0.5 text-blue-700">Khi lưu, hệ thống tự chọn vị trí trống, ưu tiên 3 banner dưới. Banner Tự động hiển thị riêng, không gộp slider.</p>
                </>
              ) : (
                <p>Tất cả các vị trí phụ đều đã có banner Active. Vui lòng chọn vị trí cụ thể để thêm media vào slider hoặc tắt một banner trước.</p>
              )}
            </div>
          </div>
        )}

        {/* SECTION 1: THÔNG TIN CƠ BẢN */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">1. Thông tin cơ bản</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Tên banner (Tiêu đề hiển thị) <span className="text-red-500">*</span>
              <input
                required
                maxLength={150}
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Ví dụ: Laptop Gaming Đỉnh Cao"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Vị trí hiển thị <span className="text-red-500">*</span>
              <select
                aria-label="Vị trí hiển thị"
                value={position}
                onChange={event => handlePositionChange(event.target.value as BannerPositionSelection)}
                className={inputClass}
              >
                <optgroup label="Banner chính giữa (Hero Slider)">
                  <option value="MAIN_HERO">Banner chính giữa (Hero Slider) — MAIN_HERO</option>
                </optgroup>
                <optgroup label="Banner phụ bên phải (2 vị trí dọc)">
                  <option value="SIDE_RIGHT_TOP">Banner phải trên — SIDE_RIGHT_TOP</option>
                  <option value="SIDE_RIGHT_BOTTOM">Banner phải dưới — SIDE_RIGHT_BOTTOM</option>
                </optgroup>
                <optgroup label="Banner phụ bên dưới (3 vị trí ngang)">
                  <option value="BOTTOM_LEFT">Banner dưới trái — BOTTOM_LEFT</option>
                  <option value="SIDE_RIGHT_MIDDLE">Banner dưới giữa — SIDE_RIGHT_MIDDLE</option>
                  <option value="BOTTOM_RIGHT">Banner dưới phải — BOTTOM_RIGHT</option>
                </optgroup>
                <optgroup label="Vị trí chưa sử dụng (Lưu trữ)">
                  <option value="SIDE_LEFT">Banner dọc trái (Không hiển thị Storefront) — SIDE_LEFT</option>
                </optgroup>
                <optgroup label="Phân bổ tự động">
                  <option value="AUTO">Tự động (chọn vị trí phụ còn trống) — AUTO</option>
                </optgroup>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Trạng thái
                <select
                  aria-label="Trạng thái"
                  value={String(isActive)}
                  onChange={event => setIsActive(event.target.value === 'true')}
                  className={inputClass}
                >
                  <option value="true">Đang bật (Active)</option>
                  <option value="false">Đang tắt (Inactive)</option>
                </select>
              </label>

              <label className={labelClass}>
                Thứ tự hiển thị
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  required
                  value={sortOrder}
                  onChange={event => setSortOrder(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: NỘI DUNG MEDIA */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-slate-900">2. Nội dung Media</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setMediaType('IMAGE');
                  resetFile();
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mediaType === 'IMAGE' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Hình ảnh
              </button>
              <button
                type="button"
                onClick={() => {
                  setMediaType('VIDEO');
                  resetFile();
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mediaType === 'VIDEO' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Video
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* File Upload Box */}
            <div>
              <label className={labelClass}>
                Chọn file {mediaType === 'IMAGE' ? 'hình ảnh' : 'video'}{' '}
                {!banner && <span className="text-red-500">*</span>}
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  key={fileKey}
                  type="file"
                  accept={mediaType === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm'}
                  onChange={event => chooseFile(event.target.files?.[0])}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {mediaType === 'IMAGE' ? 'Hỗ trợ: JPG, PNG, WEBP · tối đa 10 MB' : 'Hỗ trợ: MP4, WEBM · tối đa 50 MB'}
                {banner && ' · Bỏ trống để giữ nguyên media hiện tại.'}
              </p>
            </div>

            {/* Recommendation info */}
            <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200/80">
              <p className="font-medium text-slate-700">{bannerRecommendation(previewPosition, ratio)}</p>
              {dimensions && <p className="mt-1 text-primary-700 font-medium">Kích thước file thực tế: {dimensions.width} × {dimensions.height} px.</p>}
            </div>

            {/* Live Preview */}
            {source && (
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Xem trước trực quan
                </span>
                <div
                  className="relative mx-auto w-full overflow-hidden rounded-xl bg-slate-950 shadow-xs group"
                  data-banner-form-preview
                  style={{ aspectRatio: ratio, maxWidth: Math.min(680, ratio * 360) }}
                >
                  <BannerMedia
                    key={source}
                    banner={{ name: name || 'Media preview', altText: description, mediaType, mediaUrl: source }}
                    preview
                    onDimensions={(width, height) => setDimensions({ width, height })}
                    onInvalid={() => {
                      if (file) {
                        setInvalid(true);
                        setError('Không thể đọc media đã chọn. Vui lòng chọn file hợp lệ.');
                      }
                    }}
                  />
                  {/* Overlay text and CTA preview */}
                  {(name || description || effectiveCta) && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-3 sm:p-4 text-white">
                      {name && !/^\d+$/.test(name) && (
                        <h4 className="line-clamp-1 text-sm font-bold text-white drop-shadow">{name}</h4>
                      )}
                      {description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-200 drop-shadow">{description}</p>
                      )}
                      {effectiveCta && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
                            <span>{effectiveCta}</span>
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: ĐIỀU HƯỚNG & NÚT CTA */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">3. Điều hướng & Nút CTA</h3>
          </div>

          <div className="space-y-4">
            {/* Tùy chọn Bật/Tắt nút CTA trên ảnh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Hiển thị nút CTA trên ảnh
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bật để hiển thị nút CTA thật nổi trên banner. Mặc định tắt để tránh trùng với nút đã vẽ sẵn trong file ảnh.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showCta}
                  onClick={() => setShowCta(v => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    showCta ? 'bg-primary-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      showCta ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-xs font-medium ${showCta ? 'text-primary-700 font-semibold' : 'text-slate-500'}`}>
                  {showCta ? 'Đang bật' : 'Đang tắt'}
                </span>
              </div>
            </div>

            {/* Cảnh báo nếu bật CTA nhưng thiếu URL */}
            {showCta && !targetUrl.trim() && (
              <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Cảnh báo thiếu URL điều hướng:</p>
                  <p className="text-amber-700 mt-0.5">
                    Nút CTA đang được Bật nhưng chưa có Link URL đích. Nút CTA chỉ xuất hiện và hoạt động trên Storefront khi có cả Nhãn nút và URL đích hợp lệ.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Mô tả ngắn (Dòng phụ trên banner)
                <input
                  maxLength={200}
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  placeholder="Ví dụ: Hiệu năng đỉnh cao, giá cực tốt"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Nhãn nút CTA {showCta && <span className="text-primary-600">*</span>}
                <input
                  maxLength={60}
                  value={ctaLabel}
                  onChange={event => setCtaLabel(event.target.value)}
                  placeholder="Ví dụ: Xem Laptop ngay, Khám phá ngay..."
                  className={inputClass}
                />
              </label>
            </div>

            {!showCta && (
              <p className="text-[11px] text-slate-500">
                * Nút CTA đang tắt: Banner chỉ hiển thị hình ảnh gốc và điều hướng khi nhấp chuột (không vẽ thêm nút đè lên ảnh).
              </p>
            )}

            <div>
              <label className={labelClass}>
                Link khi nhấp vào banner (URL đích)
                <input
                  maxLength={1000}
                  value={targetUrl}
                  onChange={event => setTargetUrl(event.target.value)}
                  placeholder="/customer/products?category=pc hoặc https://…"
                  className={inputClass}
                />
              </label>

              {/* Gợi ý bộ lọc */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Gợi ý nhanh:</span>
                {FILTER_SUGGESTIONS.map(item => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => setTargetUrl(item.url)}
                    className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: SLIDESHOW */}
        {position !== 'AUTO' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-slate-900">4. Cấu hình trình chiếu (Slideshow)</h3>
            </div>

            <div className="max-w-xs">
              <label className={labelClass}>
                Thời gian chuyển slide (giây)
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={0.1}
                  required
                  value={seconds}
                  onChange={event => setSeconds(Number(event.target.value))}
                  className={inputClass}
                />
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                Áp dụng khi vị trí có từ 2 media trở lên chạy slideshow.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
