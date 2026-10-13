'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, RotateCcw, Loader2, ImageIcon, Monitor, Smartphone } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionStore } from '@/store/permission.store';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { mediaUrl } from '@/services/http.client';
import {
  getAdminBranding,
  uploadBrandingLogo,
  uploadBrandingFavicon,
  deleteBrandingLogo,
  deleteBrandingFavicon,
  type BrandingData,
} from '@/services/adminSettings.service';

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return mediaUrl(url);
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{description}</p>
    </div>
  );
}

// ── File format badge ─────────────────────────────────────────────────────────
function FileBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600">
      {label}
    </span>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────────────
function UploadZone({
  label,
  hint,
  accept,
  uploading,
  canManage,
  onFile,
}: {
  label: string;
  hint: string;
  accept: string;
  uploading: boolean;
  canManage: boolean;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canManage || uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
        canManage && !uploading
          ? 'cursor-pointer border-slate-200 hover:border-primary-400 hover:bg-primary-50/40'
          : 'border-slate-200 opacity-50'
      }`}
      onClick={() => canManage && !uploading && ref.current?.click()}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary-600" /> : <Upload className="h-5 w-5 text-slate-400" />}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">{uploading ? 'Đang tải lên…' : label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        disabled={!canManage || uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BrandingPage() {
  const token      = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const canManage  = usePermissionStore(s => s.has('settings', 'manage'));
  const toast      = useToast();
  const confirm    = useConfirm();

  const [loading, setLoading]       = useState(true);
  const [branding, setBranding]     = useState<BrandingData>({ logoUrl: '', faviconUrl: '', version: '' });
  const [logoUploading, setLogoUploading]       = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  // Local preview before upload (DataURL from FileReader)
  const [logoPreview, setLogoPreview]       = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');

  useEffect(() => {
    if (!isHydrated || !token) return;
    getAdminBranding(token)
      .then(res => setBranding(res.data))
      .catch(e => toast.error(e instanceof Error ? e.message : 'Tải cài đặt thất bại.'))
      .finally(() => setLoading(false));
  }, [isHydrated, token]);

  // Derived effective display URLs
  const effectiveLogo    = logoPreview || resolveUrl(branding.logoUrl) || '/logo.png';
  const effectiveFavicon = faviconPreview || resolveUrl(branding.faviconUrl) || '/logo.png';
  const hasCustomLogo    = !!branding.logoUrl;
  const hasCustomFavicon = !!branding.faviconUrl;

  // ── Logo handlers ──────────────────────────────────────────────────────────
  const handleLogoFile = (file: File) => {
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setLogoUploading(true);
    uploadBrandingLogo(token!, file)
      .then(({ logoUrl }) => {
        setBranding(b => ({ ...b, logoUrl, version: String(Date.now()) }));
        setLogoPreview('');
        toast.success('Đã cập nhật logo.');
      })
      .catch(e => {
        setLogoPreview('');
        toast.error(e instanceof Error ? e.message : 'Tải logo thất bại.');
      })
      .finally(() => setLogoUploading(false));
  };

  const handleLogoDelete = async () => {
    const ok = await confirm({
      title: 'Xóa logo tùy chỉnh?',
      description: 'Logo sẽ được khôi phục về ảnh mặc định (/logo.png).',
      confirmLabel: 'Xóa',
      tone: 'warning',
      destructive: true,
    });
    if (!ok) return;
    setLogoUploading(true);
    deleteBrandingLogo(token!)
      .then(() => {
        setBranding(b => ({ ...b, logoUrl: '', version: String(Date.now()) }));
        toast.success('Đã xóa logo tùy chỉnh, trả về mặc định.');
      })
      .catch(e => toast.error(e instanceof Error ? e.message : 'Xóa logo thất bại.'))
      .finally(() => setLogoUploading(false));
  };

  // ── Favicon handlers ───────────────────────────────────────────────────────
  const handleFaviconFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setFaviconPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setFaviconUploading(true);
    uploadBrandingFavicon(token!, file)
      .then(({ faviconUrl }) => {
        setBranding(b => ({ ...b, faviconUrl, version: String(Date.now()) }));
        setFaviconPreview('');
        toast.success('Đã cập nhật favicon.');
      })
      .catch(e => {
        setFaviconPreview('');
        toast.error(e instanceof Error ? e.message : 'Tải favicon thất bại.');
      })
      .finally(() => setFaviconUploading(false));
  };

  const handleFaviconDelete = async () => {
    const ok = await confirm({
      title: 'Xóa favicon tùy chỉnh?',
      description: 'Favicon sẽ được khôi phục về mặc định.',
      confirmLabel: 'Xóa',
      tone: 'warning',
      destructive: true,
    });
    if (!ok) return;
    setFaviconUploading(true);
    deleteBrandingFavicon(token!)
      .then(() => {
        setBranding(b => ({ ...b, faviconUrl: '', version: String(Date.now()) }));
        toast.success('Đã xóa favicon tùy chỉnh, trả về mặc định.');
      })
      .catch(e => toast.error(e instanceof Error ? e.message : 'Xóa favicon thất bại.'))
      .finally(() => setFaviconUploading(false));
  };

  return (
    <AdminGuard permission="settings:view">
      <section className="space-y-6">
        <AdminPageHeader title="Logo & Favicon" />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {/* ── Logo Section ─────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <SectionHead
                title="Logo website"
                description="Logo hiển thị trong Header, Footer và Mobile drawer. Ưu tiên PNG/WebP nền trong suốt."
              />

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Current preview */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Xem trước</p>
                  <div className="flex flex-col gap-2">
                    {/* Light background preview */}
                    <div className="flex h-20 items-center justify-center rounded-xl border border-slate-200 bg-white px-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={effectiveLogo}
                        alt="Logo preview"
                        className="max-h-14 max-w-[180px] object-contain"
                        onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                      />
                    </div>
                    {/* Dark background preview */}
                    <div className="flex h-20 items-center justify-center rounded-xl bg-slate-900 px-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={effectiveLogo}
                        alt="Logo preview dark"
                        className="max-h-14 max-w-[180px] object-contain"
                        onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                      />
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {hasCustomLogo ? (
                      <>
                        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-50 px-2 text-emerald-700 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Logo tùy chỉnh
                        </span>
                        <FileBadge label="WebP" />
                      </>
                    ) : (
                      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-slate-100 px-2 text-slate-500">
                        <ImageIcon className="h-3 w-3 shrink-0" /> Logo mặc định
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload + actions */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Thao tác</p>
                  <UploadZone
                    label={hasCustomLogo ? 'Thay thế logo' : 'Tải logo lên'}
                    hint="JPG, PNG, WebP — tối đa 5 MB"
                    accept="image/jpeg,image/png,image/webp"
                    uploading={logoUploading}
                    canManage={canManage}
                    onFile={handleLogoFile}
                  />
                  {hasCustomLogo && canManage && (
                    <button
                      type="button"
                      onClick={handleLogoDelete}
                      disabled={logoUploading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Khôi phục logo mặc định
                    </button>
                  )}
                  {!canManage && (
                    <p className="text-xs text-slate-400 text-center">Bạn không có quyền thay đổi logo.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Favicon Section ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <SectionHead
                title="Favicon"
                description="Icon nhỏ xuất hiện trên tab trình duyệt. PNG hoặc ICO vuông 32×32 px trở lên."
              />

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Favicon preview */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Xem trước</p>

                  {/* Browser tab simulation */}
                  <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                    <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-slate-300 bg-white px-3 py-2 shadow-sm w-fit max-w-[220px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={effectiveFavicon}
                        alt="Favicon"
                        className="h-4 w-4 shrink-0 object-contain"
                        onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                      />
                      <span className="truncate text-xs text-slate-700">DUCMANH PC</span>
                      <span className="ml-auto shrink-0 text-slate-400 text-xs">✕</span>
                    </div>
                    <div className="h-12 rounded-b-lg border border-slate-300 bg-white" />
                  </div>

                  {/* Large favicon preview */}
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={effectiveFavicon}
                      alt="Favicon large"
                      className="h-12 w-12 rounded-lg border border-slate-100 object-contain p-1"
                      onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Favicon hiện tại</p>
                      <p className="text-xs text-slate-400">96×96 px (PNG)</p>
                    </div>
                    {hasCustomFavicon ? (
                      <span className="ml-auto inline-flex h-5 items-center gap-1 rounded-full bg-emerald-50 px-2 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Tùy chỉnh
                      </span>
                    ) : (
                      <span className="ml-auto inline-flex h-5 items-center rounded-full bg-slate-100 px-2 text-xs text-slate-500">Mặc định</span>
                    )}
                  </div>
                </div>

                {/* Favicon upload + actions */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Thao tác</p>
                  <UploadZone
                    label={hasCustomFavicon ? 'Thay thế favicon' : 'Tải favicon lên'}
                    hint="PNG, WebP, ICO — tối đa 5 MB"
                    accept="image/png,image/webp,image/jpeg,image/x-icon,.ico"
                    uploading={faviconUploading}
                    canManage={canManage}
                    onFile={handleFaviconFile}
                  />
                  {hasCustomFavicon && canManage && (
                    <button
                      type="button"
                      onClick={handleFaviconDelete}
                      disabled={faviconUploading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Khôi phục favicon mặc định
                    </button>
                  )}
                  {!canManage && (
                    <p className="text-xs text-slate-400 text-center">Bạn không có quyền thay đổi favicon.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Live Preview Strip ────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <SectionHead
                title="Xem trước trên website"
                description="Mô phỏng các vị trí logo trên Storefront."
              />

              <div className="space-y-3">
                {/* Desktop Header simulation */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Monitor className="h-3.5 w-3.5" />
                    Header Desktop
                  </div>
                  <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={effectiveLogo} alt="Header logo" className="h-9 max-w-[120px] object-contain" onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }} />
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-2 w-32 rounded-full bg-slate-100" />
                      <div className="ml-auto flex gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100" />
                        <div className="h-7 w-7 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Header simulation */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Smartphone className="h-3.5 w-3.5" />
                    Header Mobile (Drawer)
                  </div>
                  <div className="flex h-14 w-60 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={effectiveLogo} alt="Mobile logo" className="h-8 max-w-[100px] object-contain" onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }} />
                    <span className="text-slate-300 text-lg">✕</span>
                  </div>
                </div>

                {/* Footer simulation */}
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Monitor className="h-3.5 w-3.5" />
                    Footer
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={effectiveLogo} alt="Footer logo" className="h-11 max-w-[110px] object-contain" onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }} />
                    <div className="space-y-1.5">
                      <div className="h-2 w-24 rounded-full bg-slate-200" />
                      <div className="h-2 w-32 rounded-full bg-slate-200" />
                      <div className="h-2 w-20 rounded-full bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </AdminGuard>
  );
}
