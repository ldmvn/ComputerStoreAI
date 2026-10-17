'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, Save } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionStore } from '@/store/permission.store';
import { getAdminSettings, updateAdminSettings, type StoreSettings } from '@/services/adminSettings.service';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'order' | 'inventory' | 'feature' | 'seo';

const TABS: { id: Tab; label: string }[] = [
  { id: 'order',     label: 'Đơn hàng' },
  { id: 'inventory', label: 'Tồn kho' },
  { id: 'feature',   label: 'Tính năng' },
  { id: 'seo',       label: 'SEO & Meta' },
];

// Keys each tab owns — used for dirty-tracking per tab.
const TAB_KEYS: Record<Tab, string[]> = {
  order:     ['order.min_amount', 'order.auto_cancel_hours', 'order.max_qty_per_item'],
  inventory: ['inventory.low_stock'],
  feature:   ['feature.build_pc', 'feature.reviews', 'feature.wishlist', 'feature.guest_checkout'],
  seo:       ['seo.site_title', 'seo.description', 'seo.keywords', 'general.timezone', 'general.currency', 'general.date_format'],
};

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (UTC+7)' },
  { value: 'Asia/Bangkok',     label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Singapore',   label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo',       label: 'Tokyo (UTC+9)' },
  { value: 'Europe/London',    label: 'London (UTC+0/+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
];

const CURRENCIES = [
  { value: 'VND', label: 'VND — Đồng Việt Nam' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

// ── Small field components ────────────────────────────────────────────────────

function NumberField({ label, settingKey, values, onChange, min, max, unit }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void; min?: number; max?: number; unit?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min} max={max}
          value={values[settingKey] ?? ''}
          onChange={e => onChange(settingKey, e.target.value)}
          className="w-40 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

function TextField({ label, settingKey, values, onChange, maxLength, placeholder }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void; maxLength?: number; placeholder?: string;
}) {
  const val = values[settingKey] ?? '';
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={val}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={e => onChange(settingKey, e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs text-slate-400">{val.length}/{maxLength}</p>
      )}
    </div>
  );
}

function TextareaField({ label, settingKey, values, onChange, maxLength, placeholder, rows = 3 }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void; maxLength?: number; placeholder?: string; rows?: number;
}) {
  const val = values[settingKey] ?? '';
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        rows={rows}
        value={val}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={e => onChange(settingKey, e.target.value)}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs text-slate-400">{val.length}/{maxLength}</p>
      )}
    </div>
  );
}

function SelectField({ label, settingKey, values, onChange, options }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <select
        value={values[settingKey] ?? ''}
        onChange={e => onChange(settingKey, e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({ label, desc, settingKey, values, onChange, canManage }: {
  label: string; desc?: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void; canManage: boolean;
}) {
  const on = (values[settingKey] ?? 'true') === 'true';
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
      </div>
      <button
        type="button"
        disabled={!canManage}
        onClick={() => canManage && onChange(settingKey, on ? 'false' : 'true')}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-primary-600' : 'bg-slate-300'} ${!canManage ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-checked={on}
        role="switch"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

// ── Save bar ─────────────────────────────────────────────────────────────────

function SaveBar({ dirty, saving, canManage, onSave }: {
  dirty: boolean; saving: boolean; canManage: boolean; onSave: () => void;
}) {
  if (!dirty) return null;
  return (
    <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-between border-t border-amber-200 bg-amber-50 px-6 py-3 shadow-sm">
      <p className="text-sm font-medium text-amber-700">Có thay đổi chưa lưu</p>
      {canManage ? (
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu thay đổi
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <Lock className="h-4 w-4" /> Cần quyền <code className="rounded bg-slate-100 px-1 text-xs">settings:manage</code>
        </span>
      )}
    </div>
  );
}

// ── Live clock preview ────────────────────────────────────────────────────────

function ClockPreview({ timezone }: { timezone: string }) {
  const [time, setTime] = useState('');
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      try {
        setTime(new Intl.DateTimeFormat('vi-VN', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()));
      } catch { setTime(''); }
    };
    tick();
    ref.current = setInterval(tick, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [timezone]);

  if (!time) return null;
  return <p className="mt-1.5 text-xs text-slate-500">Giờ hiện tại: <span className="font-mono font-medium text-slate-700">{time}</span></p>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GeneralSettingsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const canManage = usePermissionStore(s => s.has('settings', 'manage'));

  const [values, setValues]   = useState<StoreSettings>({});
  const [saved, setSaved]     = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('order');

  useEffect(() => {
    if (!isHydrated) return;
    setLoading(true);
    getAdminSettings(token)
      .then(r => { setValues(r.data ?? {}); setSaved(r.data ?? {}); })
      .catch(e => setError(e instanceof Error ? e.message : 'Tải thất bại.'))
      .finally(() => setLoading(false));
  }, [isHydrated, token]);

  const change = (key: string, val: string) =>
    setValues(v => ({ ...v, [key]: val }));

  // Per-tab dirty check
  const tabDirty = (tab: Tab) =>
    TAB_KEYS[tab].some(k => (values[k] ?? '') !== (saved[k] ?? ''));

  const currentTabDirty = tabDirty(activeTab);

  const handleSave = async () => {
    if (!canManage) return;
    setSaving(true); setError(''); setSuccess('');
    const patch: StoreSettings = {};
    TAB_KEYS[activeTab].forEach(k => { patch[k] = values[k] ?? ''; });
    try {
      await updateAdminSettings(token, patch);
      setSaved(s => ({ ...s, ...patch }));
      setSuccess('Đã lưu cài đặt.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally { setSaving(false); }
  };

  return (
    <AdminGuard permission="settings:view">
      <section className="relative">
        <AdminPageHeader title="Cấu hình chung" />
        <AdminFeedback error={error} message={success} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  {tabDirty(tab.id) && (
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="max-w-2xl space-y-5">

              {activeTab === 'order' && (
                <>
                  <NumberField label="Giá trị đơn hàng tối thiểu" settingKey="order.min_amount" values={values} onChange={change} min={0} unit="₫" />
                  <NumberField label="Tự động huỷ đơn hàng sau" settingKey="order.auto_cancel_hours" values={values} onChange={change} min={0} unit="giờ" />
                  <NumberField label="Số lượng tối đa mỗi sản phẩm / đơn" settingKey="order.max_qty_per_item" values={values} onChange={change} min={1} max={999} />
                </>
              )}

              {activeTab === 'inventory' && (
                <>
                  <NumberField label="Ngưỡng cảnh báo tồn kho thấp" settingKey="inventory.low_stock" values={values} onChange={change} min={0} unit="sản phẩm" />
                </>
              )}

              {activeTab === 'feature' && (
                <div className="space-y-3">
                  <ToggleRow label="Build PC" desc="Cho phép khách hàng tự build cấu hình PC." settingKey="feature.build_pc" values={values} onChange={change} canManage={canManage} />
                  <ToggleRow label="Đánh giá sản phẩm" desc="Khách hàng có thể viết đánh giá sau khi mua." settingKey="feature.reviews" values={values} onChange={change} canManage={canManage} />
                  <ToggleRow label="Danh sách yêu thích" desc="Nút Yêu thích hiển thị trên trang sản phẩm." settingKey="feature.wishlist" values={values} onChange={change} canManage={canManage} />
                  <ToggleRow label="Thanh toán khách" desc="Cho phép đặt hàng mà không cần đăng nhập." settingKey="feature.guest_checkout" values={values} onChange={change} canManage={canManage} />
                </div>
              )}

              {activeTab === 'seo' && (
                <>
                  <TextField label="Tiêu đề website" settingKey="seo.site_title" values={values} onChange={change} maxLength={70} placeholder="DUCMANH PC — Linh kiện & PC Gaming" />
                  <TextareaField label="Mô tả meta" settingKey="seo.description" values={values} onChange={change} maxLength={160} placeholder="Chuyên cung cấp linh kiện máy tính chính hãng..." rows={3} />
                  <TextField label="Từ khoá meta" settingKey="seo.keywords" values={values} onChange={change} maxLength={200} placeholder="linh kiện máy tính, PC gaming, build pc" />
                  <div>
                    <SelectField label="Múi giờ" settingKey="general.timezone" values={values} onChange={change} options={TIMEZONES} />
                    <ClockPreview timezone={values['general.timezone'] ?? 'Asia/Ho_Chi_Minh'} />
                  </div>
                  <SelectField label="Đơn vị tiền tệ" settingKey="general.currency" values={values} onChange={change} options={CURRENCIES} />
                  <SelectField label="Định dạng ngày" settingKey="general.date_format" values={values} onChange={change} options={DATE_FORMATS} />
                </>
              )}
            </div>

            <SaveBar dirty={currentTabDirty} saving={saving} canManage={canManage} onSave={handleSave} />
          </>
        )}
      </section>
    </AdminGuard>
  );
}
