'use client';

import { useEffect, useState } from 'react';
import type { Banner, BannerGroup, BannerPositionSelection, MediaType } from '@/types/banner.type';
import { AUTO_SIDE_ORDER, BANNER_POSITIONS, IMAGE_LIMIT, VIDEO_LIMIT, bannerRecommendation } from '@/lib/banner';
import { mediaUrl } from '@/services/http.client';
import { saveBanner } from '@/services/banner.service';
import Modal from '@/components/ui/Modal';
import BannerMedia from '@/components/home/banner/BannerMedia';
import { useBannerAspectRatio } from '@/hooks/useBannerAspectRatio';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50';
const labelClass = 'block text-sm font-medium text-slate-700';

export default function BannerForm({ banner, initialPosition, banners, token, onClose, onSaved }: {
  banner?: Banner; initialPosition: BannerPositionSelection; banners: Banner[]; token: string | null; onClose: () => void; onSaved: (banner: Banner) => void;
}) {
  const [name, setName] = useState(banner?.name || '');
  const [group, setGroup] = useState<BannerGroup>(banner?.group || (initialPosition.startsWith('MAIN') ? 'MAIN' : 'SIDE'));
  const [position, setPosition] = useState<BannerPositionSelection>(banner?.isAutoPlaced ? 'AUTO' : banner?.position || initialPosition);
  const [mediaType, setMediaType] = useState<MediaType>(banner?.mediaType || 'IMAGE');
  const [targetUrl, setTargetUrl] = useState(banner?.targetUrl || '');
  const [altText, setAltText] = useState(banner?.altText || '');
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
  const occupied = banners.filter(item => item.group === 'SIDE' && item.isActive && item.id !== banner?.id);
  const autoOrder = banner?.group === 'SIDE' ? [banner.position, ...AUTO_SIDE_ORDER] : AUTO_SIDE_ORDER;
  const automaticPosition = autoOrder.find(candidate => !occupied.some(item => item.position === candidate));
  const previewPosition = position === 'AUTO' ? automaticPosition || 'BOTTOM_LEFT' : position;
  const ratio = useBannerAspectRatio(previewPosition);

  useEffect(() => {
    setDimensions(null); setInvalid(false);
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resetFile = () => { setFile(null); setFileKey(value => value + 1); setError(''); };
  const chooseFile = (selected: File | undefined) => {
    setError(''); setFile(null);
    if (!selected) return;
    if (!selected.size) { setError('File media rỗng. Vui lòng chọn file khác.'); setFileKey(value => value + 1); return; }
    const types = mediaType === 'IMAGE' ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm'];
    const extension = mediaType === 'IMAGE' ? /\.(jpe?g|png|webp)$/i : /\.(mp4|webm)$/i;
    if (!types.includes(selected.type) || !extension.test(selected.name)) { setError('Định dạng/MIME không đúng loại media đã chọn.'); setFileKey(value => value + 1); return; }
    if (selected.size > (mediaType === 'IMAGE' ? IMAGE_LIMIT : VIDEO_LIMIT)) { setError(mediaType === 'IMAGE' ? 'Ảnh tối đa 10 MB.' : 'Video tối đa 50 MB.'); setFileKey(value => value + 1); return; }
    setFile(selected);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (file && invalid) { setError('Không thể đọc media đã chọn. Vui lòng chọn file hợp lệ.'); return; }
    if (!file && (!banner || banner.mediaType !== mediaType)) { setError('Vui lòng chọn media phù hợp trước khi lưu.'); return; }
    const body = new FormData();
    for (const [key, value] of Object.entries({ name, group, position, mediaType, targetUrl, altText, sortOrder, autoplayInterval: Math.round(seconds * 1000), isActive })) body.set(key, String(value));
    if (file) body.set('media', file);
    setBusy(true);
    try { const result = await saveBanner(token, body, banner?.id); onSaved(result.banner); }
    catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu banner.'); }
    finally { setBusy(false); }
  };
  const source = preview || (banner && banner.mediaType === mediaType ? mediaUrl(banner.mediaUrl) : '');
  return <Modal title={banner ? 'Sửa banner' : 'Thêm banner'} onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      {position === 'AUTO' && <p role="status" className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{automaticPosition ? `Dự kiến: ${BANNER_POSITIONS.find(item => item.position === automaticPosition)?.label}. Khi lưu, hệ thống chọn vị trí trống, ưu tiên hai banner dưới. Banner Tự động hiển thị riêng, không gộp slider.` : 'Cả sáu vị trí đã có banner Active. Chọn vị trí cụ thể để thêm media vào slider hoặc tắt một banner trước.'}</p>}
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>Tên banner<input required maxLength={150} value={name} onChange={event => setName(event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Nhóm banner<select aria-label="Nhóm banner" value={group} onChange={event => { const value = event.target.value as BannerGroup; setGroup(value); setPosition(value === 'MAIN' ? 'MAIN_HERO' : 'AUTO'); setError(''); }} className={inputClass}><option value="MAIN">Banner chính</option><option value="SIDE">Banner phụ</option></select></label>
        <label className={labelClass}>Vị trí<select aria-label="Vị trí" value={position} onChange={event => setPosition(event.target.value as BannerPositionSelection)} className={inputClass}>{group === 'SIDE' && <option value="AUTO">Tự động (chọn vị trí trống)</option>}{BANNER_POSITIONS.filter(item => item.group === group).map(item => <option key={item.position} value={item.position}>{item.label} ({item.position})</option>)}</select></label>
        <label className={labelClass}>Loại media<select aria-label="Loại media" value={mediaType} onChange={event => { setMediaType(event.target.value as MediaType); resetFile(); }} className={inputClass}><option value="IMAGE">Image</option><option value="VIDEO">Video</option></select></label>
        <label className={labelClass}>Trạng thái<select aria-label="Trạng thái" value={String(isActive)} onChange={event => setIsActive(event.target.value === 'true')} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <label className={`${labelClass} sm:col-span-2`}>Upload media<input key={fileKey} type="file" accept={mediaType === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm'} onChange={event => chooseFile(event.target.files?.[0])} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">{mediaType === 'IMAGE' ? 'JPG, PNG, WEBP · tối đa 10 MB' : 'MP4, WEBM · tối đa 50 MB'}{banner && ' · Không chọn file mới để giữ media hiện tại.'}</span></label>
        <div className="text-sm text-slate-500 sm:col-span-2"><p>{bannerRecommendation(previewPosition, ratio)}</p>{mediaType === 'VIDEO' && <p className="mt-1">Nên upload video có cùng tỉ lệ với khung banner.</p>}{dimensions && <p className="mt-1">Media: {dimensions.width} × {dimensions.height} px.</p>}{dimensions && Math.max(dimensions.width / dimensions.height / ratio, ratio / (dimensions.width / dimensions.height)) > 1.25 && <p role="status" className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-800">Media này có tỉ lệ khác nhiều so với banner và có thể bị cắt khi hiển thị. Bạn vẫn có thể lưu.</p>}</div>
        {source && <div className="relative mx-auto w-full overflow-hidden rounded-xl bg-slate-100 sm:col-span-2" data-banner-form-preview style={{ aspectRatio: ratio, maxWidth: Math.min(680, ratio * 420) }}><BannerMedia key={source} banner={{ name: name || 'Media preview', altText, mediaType, mediaUrl: source }} preview onDimensions={(width, height) => setDimensions({ width, height })} onInvalid={() => { if (file) { setInvalid(true); setError('Không thể đọc media đã chọn. Vui lòng chọn file hợp lệ.'); } }} /></div>}
        <label className={`${labelClass} sm:col-span-2`}>Link khi click<input maxLength={1000} value={targetUrl} onChange={event => setTargetUrl(event.target.value)} placeholder="/customer/products hoặc https://…" className={inputClass} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Alt text<input maxLength={300} value={altText} onChange={event => setAltText(event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Thứ tự<input type="number" min={0} max={1000000} step={1} required value={sortOrder} onChange={event => setSortOrder(Number(event.target.value))} className={inputClass} /></label>
        {position !== 'AUTO' && <label className={labelClass}>Thời gian chuyển slide (giây)<input type="number" min={1} max={60} step={0.1} required value={seconds} onChange={event => setSeconds(Number(event.target.value))} className={inputClass} /></label>}
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {busy && <p role="status" className="mt-4 text-sm text-slate-600">Đang upload và lưu banner…</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="ui-button ui-button--neutral rounded-lg border px-4 py-2 disabled:opacity-50">Hủy</button><button type="submit" disabled={busy || (position === 'AUTO' && !automaticPosition)} className="ui-button ui-button--primary rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu banner'}</button></div>
    </form>
  </Modal>;
}
