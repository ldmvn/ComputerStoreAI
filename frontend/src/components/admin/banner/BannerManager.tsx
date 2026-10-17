'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Banner, BannerGroup, BannerPositionSelection } from '@/types/banner.type';
import { useAuthStore } from '@/store/auth.store';
import { deleteBanner, getAdminBanners, reorderBanners, setBannerStatus } from '@/services/banner.service';
import { Skeleton } from '@/components/ui/Skeleton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import BannerCard from './BannerCard';
import BannerForm from './BannerForm';
import BannerPreview from './BannerPreview';
import BannerDeleteDialog from './BannerDeleteDialog';

export default function BannerManager() {
  const token = useAuthStore(state => state.token);
  const [group, setGroup] = useState<BannerGroup>('MAIN');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{ banner?: Banner; position: BannerPositionSelection } | null>(null);
  const [preview, setPreview] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError('');
    try { setBanners((await getAdminBanners(token, signal)).banners); }
    catch (error) { if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : 'Không tải được banner.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [token]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 5000); return () => window.clearTimeout(timer); }, [message]);
  const action = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); setMessage(success); await load(); return true; }
    catch (error) { setError(error instanceof Error ? error.message : 'Thao tác không thành công.'); return false; }
    finally { setBusy(false); }
  };
  const move = (banner: Banner, direction: -1 | 1) => {
    const items = banners.filter(item => item.position === banner.position).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const index = items.findIndex(item => item.id === banner.id);
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    void action(() => reorderBanners(token, banner.position, items.map(item => item.id)), 'Đã lưu thứ tự banner.');
  };
  return <section>
    <AdminPageHeader title="Quản lý Banner" action={<button type="button" onClick={() => setEditor({ position: group === 'MAIN' ? 'MAIN_HERO' : 'AUTO' })} disabled={busy || loading} className="ui-button ui-button--primary inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"><Plus className="h-4 w-4" />Thêm banner</button>} />
    <div className="mb-6 flex gap-2" role="group" aria-label="Nhóm banner">{(['MAIN', 'SIDE'] as const).map(item => <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)} className={`ui-button rounded-lg px-4 py-2.5 text-sm font-semibold ${group === item ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{item === 'MAIN' ? 'Banner chính' : 'Banner phụ'}</button>)}</div>
    {message && <div role="status" className="fixed right-4 top-20 z-[110] max-w-[calc(100vw-2rem)] rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg">{message}</div>}
    {error && !deleting && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loadError && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError} <button onClick={() => void load()} className="ui-link font-semibold underline">Tải lại</button></div>}
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5" aria-label={group === 'MAIN' ? 'Danh sách banner chính' : 'Danh sách banner phụ'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">{group === 'MAIN' ? 'Banner chính giữa' : 'Banner phụ'}</h2><p className="mt-1 text-xs text-slate-500">{banners.filter(banner => banner.group === group).length} banner{group === 'MAIN' ? ' · Slider chính' : ' · Quản lý chung tất cả vị trí phụ'}</p></div>
        <button type="button" disabled={busy || loading} onClick={() => setEditor({ position: group === 'MAIN' ? 'MAIN_HERO' : 'AUTO' })} className="ui-button ui-button--neutral rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">{group === 'MAIN' ? '+ Thêm banner chính' : '+ Thêm banner phụ'}</button>
      </div>
      {loading ? <Skeleton className="h-48 w-full rounded-xl" /> : !loadError && !banners.some(banner => banner.group === group) ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{group === 'MAIN' ? 'Chưa có banner chính. Khu banner sẽ ẩn trên Home.' : 'Chưa có banner phụ. Thêm banner và chọn Tự động hoặc một vị trí cụ thể.'}</p> : <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {banners.filter(banner => banner.group === group).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map(banner => {
          const siblings = banners.filter(item => item.position === banner.position).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
          const index = siblings.findIndex(item => item.id === banner.id);
          return <BannerCard key={banner.id} banner={banner} busy={busy} first={index === 0} last={index === siblings.length - 1} onPreview={() => setPreview(banner)} onEdit={() => setEditor({ banner, position: banner.position })} onToggle={() => void action(() => setBannerStatus(token, banner.id, !banner.isActive), banner.isActive ? 'Đã tắt banner.' : 'Đã bật banner.')} onDelete={() => { setError(''); setDeleting(banner); }} onMove={direction => move(banner, direction)} />;
        })}
      </div>}
      {group === 'SIDE' && <p className="mt-3 text-xs text-slate-500">Tự động chọn vị trí chưa có banner Active. Bạn vẫn có thể chọn vị trí cụ thể; nhiều media cùng vị trí cụ thể sẽ chạy slider; banner Tự động hiển thị riêng, không gộp slider.</p>}
    </section>
    {editor && <BannerForm key={editor.banner?.id || editor.position} banner={editor.banner} initialPosition={editor.position} banners={banners} token={token} onClose={() => setEditor(null)} onSaved={banner => { setGroup(banner.group); setEditor(null); setMessage('Đã lưu banner.'); void load(); }} />}
    {preview && <BannerPreview banner={preview} onClose={() => setPreview(null)} />}
    {deleting && <BannerDeleteDialog banner={deleting} busy={busy} error={error} onClose={() => { setDeleting(null); setError(''); }} onConfirm={() => { void action(() => deleteBanner(token, deleting.id), 'Đã xóa banner.').then(success => { if (success) setDeleting(null); }); }} />}
  </section>;
}
