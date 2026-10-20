'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Monitor, Smartphone, Tablet, Trash2, Upload, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { ProductSection, PromotionalSectionInput } from '@/types/productSection.type';
import { mediaUrl } from '@/services/http.client';
import { deletePromoSectionImage, uploadPromoSectionImage } from '@/services/productSection.service';
import PromotionalSection from '@/components/home/product-section/PromotionalSection';

function slugify(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function isSafeUrl(v: string) {
  if (!v) return true;
  if (v.startsWith('/') && !v.startsWith('//')) return true;
  try { return ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; }
}

const PRESETS = [
  { value: 'dark-premium',      label: 'Dark Premium',      desc: 'Nền đen, chữ trắng, nút cam' },
  { value: 'ember-orange',      label: 'Ember Orange',      desc: 'Nền cam thương hiệu' },
  { value: 'light-minimal',     label: 'Light Minimal',     desc: 'Nền trắng, nút cam' },
  { value: 'image-background',  label: 'Image Background',  desc: 'Ảnh nền với overlay' },
] as const;

const LAYOUTS = [
  { value: 'text-left-cta-right', label: 'Text trái — CTA phải', desc: 'Banner ngang kiểu HACOM' },
  { value: 'image-left',          label: 'Ảnh trái — Nội dung phải', desc: 'Ảnh minh họa bên trái' },
  { value: 'image-right',         label: 'Nội dung trái — Ảnh phải', desc: 'Ảnh minh họa bên phải' },
] as const;

const IMAGE_POS = [
  { value: 'right',      label: 'Bên phải' },
  { value: 'left',       label: 'Bên trái' },
  { value: 'background', label: 'Nền toàn khối' },
  { value: 'none',       label: 'Ẩn ảnh' },
] as const;

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const PREVIEW_WIDTH: Record<PreviewMode, string> = {
  desktop: 'w-full',
  tablet:  'w-[768px] max-w-full',
  mobile:  'w-[390px] max-w-full',
};

function inputCls(err?: boolean) {
  return `w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition
    ${err ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}
    disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`;
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {text}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>;
}

export default function PromotionalSectionForm({
  section,
  token,
  busy,
  onClose,
  onSave,
}: {
  section?: ProductSection;
  token: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: (input: PromotionalSectionInput) => void;
}) {
  const isEdit = Boolean(section);

  const [name, setName] = useState(section?.name ?? '');
  const [slug, setSlug] = useState(section?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [sortOrder, setSortOrder] = useState(String(section?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(section?.isActive ?? true);
  const [badge, setBadge] = useState(section?.badge ?? '');
  const [promoTitle, setPromoTitle] = useState(section?.promoTitle ?? '');
  const [description, setDescription] = useState(section?.description ?? '');
  const [ctaEnabled, setCtaEnabled] = useState(section?.ctaEnabled ?? true);
  const [ctaLabel, setCtaLabel] = useState(section?.ctaLabel ?? '');
  const [ctaUrl, setCtaUrl] = useState(section?.ctaUrl ?? '');
  const [ctaStyle, setCtaStyle] = useState<'primary' | 'outline'>(section?.ctaStyle ?? 'primary');
  const [ctaRounded, setCtaRounded] = useState<'rounded' | 'pill'>(section?.ctaRounded ?? 'pill');
  const [imageAlt, setImageAlt] = useState(section?.imageAlt ?? '');
  const [imagePos, setImagePos] = useState<PromotionalSectionInput['imagePos']>(section?.imagePos ?? 'right');
  const [colorPreset, setColorPreset] = useState<PromotionalSectionInput['colorPreset']>(section?.colorPreset ?? 'dark-premium');
  const [layout, setLayout] = useState<PromotionalSectionInput['layout']>(section?.layout ?? 'text-left-cta-right');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');

  // Image upload state (edit mode only)
  const [currentImageUrl, setCurrentImageUrl] = useState(section?.imageUrl ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Tên quản lý bắt buộc.';
    if (!slug.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errs.slug = 'Slug chỉ gồm chữ thường, số, dấu gạch ngang.';
    if (ctaUrl && !isSafeUrl(ctaUrl)) errs.ctaUrl = 'URL không hợp lệ. Dùng đường dẫn nội bộ (/...) hoặc https://.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      type: 'PROMOTIONAL_SECTION',
      name: name.trim(),
      slug: slug.trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive,
      badge: badge.trim(),
      promoTitle: promoTitle.trim(),
      description: description.trim(),
      ctaEnabled,
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
      ctaStyle,
      ctaRounded,
      imageAlt: imageAlt.trim(),
      imagePos,
      colorPreset,
      layout,
    });
  }

  async function handleImageUpload(file: File) {
    if (!section) return;
    setUploadingImage(true); setImageError('');
    try {
      const updated = await uploadPromoSectionImage(token, section.id, file);
      setCurrentImageUrl(updated.imageUrl);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Upload ảnh thất bại.');
    } finally { setUploadingImage(false); }
  }

  async function handleImageDelete() {
    if (!section) return;
    setUploadingImage(true); setImageError('');
    try {
      await deletePromoSectionImage(token, section.id);
      setCurrentImageUrl(null);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Xóa ảnh thất bại.');
    } finally { setUploadingImage(false); }
  }

  // Live-preview section object built from current form state
  const previewSection: ProductSection = {
    ...(section ?? {} as ProductSection),
    type: 'PROMOTIONAL_SECTION',
    id: section?.id ?? 0,
    name, slug,
    sortOrder: Number(sortOrder) || 0,
    isActive,
    badge: badge || null,
    promoTitle: promoTitle || null,
    description: description || null,
    ctaEnabled,
    ctaLabel: ctaLabel || null,
    ctaUrl: ctaUrl || null,
    ctaStyle, ctaRounded,
    imageUrl: currentImageUrl,
    imageAlt: imageAlt || null,
    imagePos, colorPreset, layout,
    // product-section unused fields
    subtitle: null, viewAllUrl: null,
    showHighlightSpecs: false,
    quickFilterConfig: null,
    createdAt: '', updatedAt: '',
    products: [],
  };

  return (
    <Modal
      title={isEdit ? `Sửa khối quảng bá — ${section!.name}` : 'Tạo khối quảng bá'}
      onClose={onClose}
      busy={busy || uploadingImage}
      size="lg"
    >
      <div className="space-y-6">

        {/* ── Thông tin cơ bản ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <SectionTitle title="Thông tin cơ bản" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label text="Tên quản lý nội bộ" required />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Giới thiệu Build PC" className={inputCls(!!errors.name)} />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
            <div>
              <Label text="Slug" required />
              <input value={slug} onChange={e => { setSlugTouched(true); setSlug(e.target.value); }} placeholder="gioi-thieu-build-pc" className={inputCls(!!errors.slug)} />
              {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug}</p>}
            </div>
            <div>
              <Label text="Nhãn nhỏ (Badge)" />
              <input value={badge} onChange={e => setBadge(e.target.value)} placeholder="TÍNH NĂNG ĐỘC QUYỀN" maxLength={100} className={inputCls()} />
            </div>
            <div>
              <Label text="Tiêu đề hiển thị" />
              <input value={promoTitle} onChange={e => setPromoTitle(e.target.value)} placeholder="XÂY DỰNG CẤU HÌNH PC THEO Ý BẠN" maxLength={200} className={inputCls()} />
            </div>
            <div className="sm:col-span-2">
              <Label text="Mô tả ngắn" />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Lựa chọn linh kiện, kiểm tra tương thích và hoàn thiện cấu hình theo nhu cầu."
                className={`${inputCls()} resize-none`}
              />
            </div>
            <div>
              <Label text="Thứ tự hiển thị" />
              <input type="number" min="0" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={inputCls()} />
            </div>
            <div className="flex items-center gap-3 self-end rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
              <input type="checkbox" id="promo-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
              <label htmlFor="promo-active" className="text-sm font-medium text-slate-700">Hiển thị trên trang chủ</label>
            </div>
          </div>
        </div>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionTitle title="Nút CTA" />
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={ctaEnabled} onChange={e => setCtaEnabled(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary-600" />
              Hiển thị nút CTA
            </label>
          </div>
          {ctaEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label text="Nhãn nút" />
                <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="BẮT ĐẦU BUILD PC NGAY" maxLength={100} className={inputCls()} />
              </div>
              <div>
                <Label text="URL điều hướng" />
                <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="/customer/build-pc/manual" className={inputCls(!!errors.ctaUrl)} />
                {errors.ctaUrl && <p className="mt-1 text-xs text-red-500">{errors.ctaUrl}</p>}
              </div>
              <div>
                <Label text="Kiểu nút" />
                <select value={ctaStyle} onChange={e => setCtaStyle(e.target.value as 'primary' | 'outline')} className={inputCls()}>
                  <option value="primary">Primary (đặc)</option>
                  <option value="outline">Outline (viền)</option>
                </select>
              </div>
              <div>
                <Label text="Bo góc" />
                <select value={ctaRounded} onChange={e => setCtaRounded(e.target.value as 'rounded' | 'pill')} className={inputCls()}>
                  <option value="pill">Pill (bo tròn)</option>
                  <option value="rounded">Rounded (bo vuông)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Ảnh ─────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <SectionTitle title="Ảnh minh họa" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label text="Vị trí ảnh" />
              <select value={imagePos} onChange={e => setImagePos(e.target.value as typeof imagePos)} className={inputCls()}>
                {IMAGE_POS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label text="Alt text" />
              <input value={imageAlt} onChange={e => setImageAlt(e.target.value)} placeholder="Mô tả ảnh cho screen reader" maxLength={300} className={inputCls()} />
            </div>
          </div>

          {/* Upload — only available in edit mode */}
          {isEdit ? (
            <div className="mt-3">
              {currentImageUrl ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-100">
                    <img src={mediaUrl(currentImageUrl)} alt="Preview ảnh" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700">Ảnh hiện tại</p>
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{currentImageUrl.split('/').pop()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    disabled={uploadingImage}
                    className="shrink-0 rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    aria-label="Xóa ảnh"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white py-6 text-slate-400 transition hover:border-primary-300 hover:text-primary-500"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Chọn ảnh để upload"
                >
                  <Upload className="h-7 w-7" />
                  <p className="text-sm font-medium">Nhấn để chọn ảnh</p>
                  <p className="text-xs">JPG, PNG hoặc WEBP — tối đa 10 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); e.target.value = ''; }}
              />
              {uploadingImage && <p className="mt-1 text-xs text-slate-500">Đang xử lý ảnh...</p>}
              {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              Lưu khối trước, sau đó mở Sửa để upload ảnh.
            </p>
          )}
        </div>

        {/* ── Phong cách ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <SectionTitle title="Phong cách & Bố cục" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label text="Preset màu sắc" />
              <select value={colorPreset} onChange={e => setColorPreset(e.target.value as typeof colorPreset)} className={inputCls()}>
                {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
              </select>
            </div>
            <div>
              <Label text="Kiểu bố cục" />
              <select value={layout} onChange={e => setLayout(e.target.value as typeof layout)} className={inputCls()}>
                {LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label} — {l.desc}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Live Preview ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle title="Xem trước giao diện" />
            <div className="flex gap-1">
              {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([mode, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition
                    ${previewMode === mode ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'}`}
                  aria-label={mode}
                  aria-pressed={previewMode === mode}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
            <div className={`mx-auto transition-all duration-300 ${PREVIEW_WIDTH[previewMode]}`}>
              <PromotionalSection section={previewSection} forceLayout={previewMode} />
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            Hủy
          </button>
          <button type="button" onClick={handleSave} disabled={busy} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50">
            {busy ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo khối'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
