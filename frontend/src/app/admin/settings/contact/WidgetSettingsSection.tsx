'use client';

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Upload, RotateCcw, Loader2, Info, Lock, Save, X as XIcon,
  ArrowUp, ArrowDown, ExternalLink, Monitor, Smartphone, Send,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { mediaUrl } from '@/services/http.client';
import {
  uploadWidgetMedia, deleteWidgetMedia, type WidgetMediaChannel,
  type StoreSettings, updateAdminSettings,
} from '@/services/adminSettings.service';
import {
  resolveWidgetConfig, WIDGET_CHANNEL_IDS, WIDGET_DEFAULTS,
  validateSocialUrl, validateWidgetName, validateWidgetDescription,
  normalizeWidgetOrder, buildWidgetSavePayload,
  type WidgetChannelId,
} from '@/lib/supportWidget';
import SupportContactItem from '@/components/layout/support-widget/SupportContactItem';
import MascotAvatar from '@/components/layout/support-widget/MascotAvatar';
import { MessengerGlyph, ZaloGlyph } from '@/components/layout/support-widget/brandIcons';
import { buildSupportContacts } from '@/components/layout/support-widget/FloatingSupportPanel';

const URL_META: Record<Exclude<WidgetChannelId, 'ai'>, { placeholder: string; hint: string }> = {
  zalo:      { placeholder: 'https://zalo.me/0386220065', hint: 'zalo.me' },
  messenger: { placeholder: 'https://m.me/ldmahz',        hint: 'm.me / messenger.com' },
  telegram:  { placeholder: 'https://t.me/ldmahz',         hint: 't.me / telegram.me' },
};

function enabledKey(id: WidgetChannelId) { return id === 'ai' ? 'widget.ai.enabled' : `social.${id}.enabled`; }
function urlKey(id: WidgetChannelId) { return `social.${id}.url`; }
function nameKey(id: WidgetChannelId) { return `widget.${id}.name`; }
function descKey(id: WidgetChannelId) { return `widget.${id}.description`; }
function avatarKey(id: WidgetChannelId) { return id === 'ai' ? 'widget.ai.avatarUrl' : `widget.${id}.logoUrl`; }

function resolveMediaUrl(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  if (v.startsWith('http') || v.startsWith('data:')) return v;
  return mediaUrl(v);
}

// The real built-in default each channel falls back to when no custom
// logo/avatar is set — reuses the exact same components the live widget
// renders, so the upload slot never shows the wrong brand's image.
function defaultFallback(id: WidgetChannelId): ReactNode {
  if (id === 'ai') return <MascotAvatar />;
  if (id === 'zalo') return <ZaloGlyph className="h-full w-full" />;
  if (id === 'messenger') return <MessengerGlyph className="h-full w-full" />;
  return (
    <span className="flex h-full w-full items-center justify-center bg-[#29A9EB] text-white">
      <Send className="h-5 w-5" />
    </span>
  );
}

// ── Small building blocks ─────────────────────────────────────────────────────

function MediaSlot({
  label, hint, currentUrl, fallback, uploading, canManage, round = true, onUpload, onReset,
}: {
  label: string; hint: string; currentUrl: string; fallback: ReactNode;
  uploading: boolean; canManage: boolean; round?: boolean;
  onUpload: (file: File) => void; onReset: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hasCustom = !!currentUrl;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white ${round ? 'rounded-full' : 'rounded-lg'}`}>
        {hasCustom
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={currentUrl} alt="" className="h-full w-full object-cover" />
          : fallback}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-700">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={!canManage || uploading}
          onClick={() => ref.current?.click()}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {hasCustom ? 'Thay' : 'Tải lên'}
        </button>
        {hasCustom && canManage && (
          <button
            type="button"
            disabled={uploading}
            onClick={onReset}
            title="Khôi phục ảnh mặc định"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={!canManage || uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
      />
    </div>
  );
}

function TextField({ label, value, maxLength, error, disabled, onChange }: {
  label: string; value: string; maxLength: number; error: string | null; disabled: boolean; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-[11px] text-slate-400">{value.length}/{maxLength}</span>
      </div>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}
          disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      aria-pressed={checked}
      aria-label={label}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed
        ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Live preview (fixed pixel widths — never depends on the real viewport,
// so it can't borrow Desktop's breakpoint while rendering the Mobile frame) ──

function WidgetLivePreview({ values }: { values: StoreSettings }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const config = useMemo(() => resolveWidgetConfig(values), [values]);
  const contacts = useMemo(() => buildSupportContacts(config), [config]);
  const frameWidth = device === 'desktop' ? 360 : 300;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Xem trước Floating Support Widget</h2>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${device === 'desktop' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${device === 'mobile' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>
      </div>

      <div className="flex justify-center rounded-xl bg-slate-100 p-6">
        <div style={{ width: frameWidth }} className="space-y-3">
          {/* popup card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-800">{config.popupTitle}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{config.popupDescription}</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400">
                <XIcon className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="space-y-2 p-3" onClickCapture={e => e.preventDefault()}>
              {contacts.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-slate-400">Chưa có kênh nào được bật.</p>
              )}
              {contacts.map(c => <SupportContactItem key={c.id} contact={c} />)}
            </div>
          </div>

          {/* floating toggle */}
          <div className="flex justify-end">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-primary-600 shadow-lg shadow-primary-600/35">
              <span className="block h-full w-full overflow-hidden rounded-full">
                <MascotAvatar src={config.toggleAvatarUrl} />
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────────

export default function WidgetSettingsSection({
  token, canManage, values, setValues, savedValues, onSaved,
}: {
  token: string | null;
  canManage: boolean;
  values: StoreSettings;
  setValues: React.Dispatch<React.SetStateAction<StoreSettings>>;
  savedValues: StoreSettings;
  onSaved: (patch: StoreSettings) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingChannel, setUploadingChannel] = useState<WidgetMediaChannel | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const order = normalizeWidgetOrder(values['widget.order']);

  function patch(partial: StoreSettings) {
    setValues(v => ({ ...v, ...partial }));
  }

  function moveChannel(id: WidgetChannelId, dir: -1 | 1) {
    const idx = order.indexOf(id);
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= order.length) return;
    const next = [...order];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    patch({ 'widget.order': next.join(',') });
  }

  function handleUpload(channel: WidgetMediaChannel, settingKey: string, file: File) {
    if (!token) return;
    setUploadingChannel(channel);
    uploadWidgetMedia(token, channel, file)
      .then(({ url }) => {
        patch({ [settingKey]: url });
        onSaved({ [settingKey]: url }); // persisted immediately — Hủy must not revert it
        toast.success('Đã cập nhật ảnh.');
      })
      .catch(e => toast.error(e instanceof Error ? e.message : 'Tải ảnh thất bại.'))
      .finally(() => setUploadingChannel(null));
  }

  function handleResetMedia(channel: WidgetMediaChannel, settingKey: string) {
    if (!token) return;
    setUploadingChannel(channel);
    deleteWidgetMedia(token, channel)
      .then(() => {
        patch({ [settingKey]: '' });
        onSaved({ [settingKey]: '' });
        toast.success('Đã khôi phục ảnh mặc định.');
      })
      .catch(e => toast.error(e instanceof Error ? e.message : 'Khôi phục ảnh thất bại.'))
      .finally(() => setUploadingChannel(null));
  }

  function validateAll(): boolean {
    // Validate the exact payload buildWidgetSavePayload() is about to send —
    // same normalized defaults, so an untouched field never fails a check
    // the UI never warned about, and errors line up 1:1 with what gets saved.
    const payload = buildWidgetSavePayload(values);
    const next: Record<string, string | null> = {};
    next['widget.popup.title'] = validateWidgetName(payload['widget.popup.title']);
    next['widget.popup.description'] = validateWidgetDescription(payload['widget.popup.description'], 120);
    for (const id of WIDGET_CHANNEL_IDS) {
      next[nameKey(id)] = validateWidgetName(payload[nameKey(id)]);
      next[descKey(id)] = validateWidgetDescription(payload[descKey(id)]);
      if (id !== 'ai') next[urlKey(id)] = validateSocialUrl(id, payload[urlKey(id)]);
    }
    setFieldErrors(next);
    return Object.values(next).every(e => !e);
  }

  async function handleSave() {
    if (!validateAll()) { toast.error('Vui lòng sửa các lỗi trước khi lưu.'); return; }
    setSaving(true);
    try {
      // Every key is normalized here — 'true'/'false' for every enabled
      // toggle (never '', undefined, or a stray value) and the current
      // on-screen name/description/order even if the admin never touched
      // that specific field — so Save never fails on a field it didn't warn
      // about, regardless of what the admin actually interacted with.
      const payload = buildWidgetSavePayload(values);
      await updateAdminSettings(token, payload);
      onSaved(payload);
      toast.success('Đã lưu cấu hình Widget hỗ trợ.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    // Revert to exactly what's persisted — normalizing savedValues the same
    // way Save does, so Cancel never leaves a half-touched field behind.
    const restore = buildWidgetSavePayload(savedValues);
    patch(restore);
    setFieldErrors({});
    toast.success('Đã hủy thay đổi chưa lưu.');
  }

  return (
    <div className="space-y-5">
      {/* A — Popup config */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Cấu hình Popup
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Tiêu đề Popup"
            value={values['widget.popup.title'] ?? ''}
            maxLength={60}
            error={fieldErrors['widget.popup.title'] ?? null}
            disabled={!canManage}
            onChange={v => patch({ 'widget.popup.title': v })}
          />
          <TextField
            label="Mô tả ngắn"
            value={values['widget.popup.description'] ?? ''}
            maxLength={120}
            error={fieldErrors['widget.popup.description'] ?? null}
            disabled={!canManage}
            onChange={v => patch({ 'widget.popup.description': v })}
          />
        </div>
      </div>

      {/* B–E — Channels, in display order */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Kênh hỗ trợ &amp; thứ tự hiển thị</h2>
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <Info className="h-3 w-3 shrink-0" /> Dùng mũi tên để sắp xếp
          </p>
        </div>

        <div className="space-y-4">
          {order.map((id, idx) => {
            const isEnabled = values[enabledKey(id)] !== 'false';
            const urlVal = values[urlKey(id)] ?? '';
            const urlErr = fieldErrors[urlKey(id)] ?? null;
            const avatarUrlResolved = resolveMediaUrl(values[avatarKey(id)]);

            return (
              <div key={id} className={`rounded-xl border p-4 ${id === 'ai' ? 'border-primary-200 bg-primary-50/30' : 'border-slate-200 bg-slate-50'}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button type="button" disabled={idx === 0} onClick={() => moveChannel(id, -1)} className="text-slate-400 hover:text-primary-600 disabled:opacity-30" aria-label={`Đưa ${WIDGET_DEFAULTS[id].name} lên trên`}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" disabled={idx === order.length - 1} onClick={() => moveChannel(id, 1)} className="text-slate-400 hover:text-primary-600 disabled:opacity-30" aria-label={`Đưa ${WIDGET_DEFAULTS[id].name} xuống dưới`}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{WIDGET_DEFAULTS[id].name}</span>
                    {id === 'ai' && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700">Nổi bật</span>}
                  </div>
                  <Toggle
                    checked={isEnabled}
                    disabled={!canManage}
                    label={`${isEnabled ? 'Tắt' : 'Bật'} ${WIDGET_DEFAULTS[id].name}`}
                    onChange={() => patch({ [enabledKey(id)]: isEnabled ? 'false' : 'true' })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    label="Tên hiển thị"
                    value={values[nameKey(id)] ?? ''}
                    maxLength={40}
                    error={fieldErrors[nameKey(id)] ?? null}
                    disabled={!canManage || !isEnabled}
                    onChange={v => patch({ [nameKey(id)]: v })}
                  />
                  <TextField
                    label="Mô tả ngắn"
                    value={values[descKey(id)] ?? ''}
                    maxLength={80}
                    error={fieldErrors[descKey(id)] ?? null}
                    disabled={!canManage || !isEnabled}
                    onChange={v => patch({ [descKey(id)]: v })}
                  />
                </div>

                {id !== 'ai' && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={urlVal}
                        onChange={e => {
                          const v = e.target.value;
                          patch({ [urlKey(id)]: v });
                          setFieldErrors(prev => ({ ...prev, [urlKey(id)]: validateSocialUrl(id, v) }));
                        }}
                        placeholder={URL_META[id].placeholder}
                        disabled={!canManage || !isEnabled}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition
                          ${urlErr ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}
                          disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                      />
                      {urlVal && !urlErr && (
                        <a
                          href={urlVal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-primary-600"
                          title="Kiểm tra liên kết"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {urlErr && <p className="mt-1 text-xs text-red-500">{urlErr}</p>}
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Info className="h-3 w-3 shrink-0" /> Chỉ chấp nhận domain: {URL_META[id].hint}
                    </p>
                  </div>
                )}

                <div className={`mt-3 grid grid-cols-1 gap-3 ${id === 'ai' ? 'sm:grid-cols-2' : ''}`}>
                  <MediaSlot
                    label={id === 'ai' ? 'Avatar mục Chatbot AI' : `Logo ${WIDGET_DEFAULTS[id].name}`}
                    hint="JPG, PNG, WebP — tối đa 2 MB"
                    currentUrl={avatarUrlResolved}
                    fallback={defaultFallback(id)}
                    uploading={uploadingChannel === id}
                    canManage={canManage}
                    onUpload={f => handleUpload(id as WidgetMediaChannel, avatarKey(id), f)}
                    onReset={() => handleResetMedia(id as WidgetMediaChannel, avatarKey(id))}
                  />
                  {id === 'ai' && (
                    <MediaSlot
                      label="Avatar nút Floating Chatbot"
                      hint="Mặc định dùng chung ảnh Chatbot ở trên"
                      currentUrl={resolveMediaUrl(values['widget.ai.toggleAvatarUrl'])}
                      fallback={<MascotAvatar src={avatarUrlResolved} />}
                      uploading={uploadingChannel === 'ai-toggle'}
                      canManage={canManage}
                      onUpload={f => handleUpload('ai-toggle', 'widget.ai.toggleAvatarUrl', f)}
                      onReset={() => handleResetMedia('ai-toggle', 'widget.ai.toggleAvatarUrl')}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {canManage ? (
          <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu thay đổi
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition"
            >
              Hủy
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3 w-3" /> Bạn chỉ có quyền xem.
          </div>
        )}
      </div>

      {/* Live preview */}
      <WidgetLivePreview values={values} />
    </div>
  );
}
