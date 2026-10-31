'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Loader2, Lock, Save, ShoppingCart, Warehouse, Puzzle, Search,
  CreditCard, Shield, Banknote, Building2, QrCode, Wallet, AlertTriangle,
} from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionStore } from '@/store/permission.store';
import { getAdminSettings, updateAdminSettings, type StoreSettings } from '@/services/adminSettings.service';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'order' | 'inventory' | 'feature' | 'seo' | 'payment' | 'system';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'order',     label: 'Đơn hàng',      icon: ShoppingCart },
  { id: 'inventory', label: 'Tồn kho',        icon: Warehouse },
  { id: 'feature',   label: 'Tính năng',      icon: Puzzle },
  { id: 'seo',       label: 'SEO & Meta',     icon: Search },
  { id: 'payment',   label: 'Thanh toán',     icon: CreditCard },
  { id: 'system',    label: 'Hệ thống',       icon: Shield },
];

const TAB_KEYS: Record<Tab, string[]> = {
  order:     ['order.min_amount', 'order.auto_cancel_hours', 'order.max_qty_per_item'],
  inventory: ['inventory.low_stock'],
  feature:   ['feature.build_pc', 'feature.reviews', 'feature.wishlist'],
  seo:       ['seo.site_title', 'seo.description', 'seo.keywords', 'general.timezone', 'general.currency', 'general.date_format'],
  payment:   ['payment.cod.status', 'payment.bank_transfer.status', 'payment.vnpay.status', 'payment.momo.status'],
  system:    ['system.maintenance_mode', 'system.maintenance_message'],
};

type PaymentStatus = 'active' | 'disabled' | 'maintenance';

const PAYMENT_METHODS: { key: string; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'payment.cod.status',           label: 'COD (Thanh toán khi nhận hàng)', desc: 'Khách hàng thanh toán trực tiếp khi nhận hàng.',                    icon: Banknote },
  { key: 'payment.bank_transfer.status', label: 'Chuyển khoản ngân hàng',         desc: 'Khách chuyển khoản theo thông tin tài khoản cửa hàng.',             icon: Building2 },
  { key: 'payment.vnpay.status',         label: 'VNPay',                           desc: 'Thanh toán qua cổng VNPay (ATM, Visa, MasterCard, QR).',            icon: QrCode },
  { key: 'payment.momo.status',          label: 'MoMo',                            desc: 'Thanh toán qua ví MoMo hoặc tài khoản ngân hàng liên kết MoMo.',   icon: Wallet },
];

const STATUS_OPTIONS: { value: PaymentStatus; label: string; color: string; bg: string }[] = [
  { value: 'active',      label: 'Hoạt động', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { value: 'maintenance', label: 'Bảo trì',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  { value: 'disabled',    label: 'Tắt',       color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
];

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

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
      <Icon className="h-4 w-4 text-primary-600" />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
    </div>
  );
}

function NumberField({ label, settingKey, values, onChange, min, max, unit, disabled }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void; min?: number; max?: number; unit?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min} max={max}
          disabled={disabled}
          value={values[settingKey] ?? ''}
          onChange={e => onChange(settingKey, e.target.value)}
          className="w-40 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

function TextField({ label, settingKey, values, onChange, maxLength, placeholder, disabled }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void; maxLength?: number; placeholder?: string; disabled?: boolean;
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
        disabled={disabled}
        onChange={e => onChange(settingKey, e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs text-slate-400">{val.length}/{maxLength}</p>
      )}
    </div>
  );
}

function TextareaField({ label, settingKey, values, onChange, maxLength, placeholder, rows = 3, disabled }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void; maxLength?: number; placeholder?: string; rows?: number; disabled?: boolean;
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
        disabled={disabled}
        onChange={e => onChange(settingKey, e.target.value)}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs text-slate-400">{val.length}/{maxLength}</p>
      )}
    </div>
  );
}

function SelectField({ label, settingKey, values, onChange, options, disabled }: {
  label: string; settingKey: string; values: StoreSettings;
  onChange: (key: string, val: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <select
        value={values[settingKey] ?? ''}
        disabled={disabled}
        onChange={e => onChange(settingKey, e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
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
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ── Payment method card ─────────────────────────────────────────────────────

function PaymentMethodCard({ method, values, onChange, canManage }: {
  method: typeof PAYMENT_METHODS[number]; values: StoreSettings;
  onChange: (key: string, val: string) => void; canManage: boolean;
}) {
  const status = (values[method.key] ?? 'active') as PaymentStatus;
  const statusInfo = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
  const Icon = method.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">{method.label}</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{method.desc}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={!canManage}
            onClick={() => canManage && onChange(method.key, opt.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors
              ${status === opt.value
                ? `${opt.bg} ${opt.color} ring-1 ring-inset ${opt.value === 'active' ? 'ring-emerald-300' : opt.value === 'maintenance' ? 'ring-amber-300' : 'ring-slate-300'}`
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}
              ${!canManage ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
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

  const maintenanceOn = (values['system.maintenance_mode'] ?? 'false') === 'true';

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
            {/* Tab bar — underline style matching contact page */}
            <div className="mb-6 border-b border-slate-200">
              <nav className="-mb-px flex gap-0 overflow-x-auto">
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  const dirty = tabDirty(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                        ${active
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {dirty && (
                        <span className="absolute right-1 top-2 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="max-w-3xl">

              {/* ── Tab: Đơn hàng ──────────────────────────────────────── */}
              {activeTab === 'order' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle icon={ShoppingCart} title="Cấu hình đơn hàng" />
                  <div className="space-y-5">
                    <NumberField label="Giá trị đơn hàng tối thiểu" settingKey="order.min_amount" values={values} onChange={change} min={0} unit="₫" disabled={!canManage} />
                    <NumberField label="Tự động huỷ đơn hàng sau" settingKey="order.auto_cancel_hours" values={values} onChange={change} min={0} unit="giờ" disabled={!canManage} />
                    <NumberField label="Số lượng tối đa mỗi sản phẩm / đơn" settingKey="order.max_qty_per_item" values={values} onChange={change} min={1} max={999} disabled={!canManage} />
                  </div>
                  {canManage && currentTabDirty && (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                  {!canManage && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                      <Lock className="h-3 w-3" /> Bạn chỉ có quyền xem. Liên hệ quản trị viên cấp cao để chỉnh sửa.
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Tồn kho ───────────────────────────────────────── */}
              {activeTab === 'inventory' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle icon={Warehouse} title="Cấu hình tồn kho" />
                  <div className="space-y-5">
                    <NumberField label="Ngưỡng cảnh báo tồn kho thấp" settingKey="inventory.low_stock" values={values} onChange={change} min={0} unit="sản phẩm" disabled={!canManage} />
                  </div>
                  {canManage && currentTabDirty && (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                  {!canManage && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                      <Lock className="h-3 w-3" /> Bạn chỉ có quyền xem. Liên hệ quản trị viên cấp cao để chỉnh sửa.
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Tính năng ─────────────────────────────────────── */}
              {activeTab === 'feature' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle icon={Puzzle} title="Bật / tắt tính năng" />
                  <div className="space-y-3">
                    <ToggleRow label="Build PC" desc="Cho phép khách hàng tự build cấu hình PC." settingKey="feature.build_pc" values={values} onChange={change} canManage={canManage} />
                    <ToggleRow label="Đánh giá sản phẩm" desc="Khách hàng có thể viết đánh giá sau khi mua." settingKey="feature.reviews" values={values} onChange={change} canManage={canManage} />
                    <ToggleRow label="Danh sách yêu thích" desc="Nút Yêu thích hiển thị trên trang sản phẩm." settingKey="feature.wishlist" values={values} onChange={change} canManage={canManage} />
                  </div>
                  {canManage && currentTabDirty && (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: SEO & Meta ────────────────────────────────────── */}
              {activeTab === 'seo' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle icon={Search} title="SEO & Cấu hình chung" />
                  <div className="space-y-5">
                    <TextField label="Tiêu đề website" settingKey="seo.site_title" values={values} onChange={change} maxLength={70} placeholder="DUCMANH PC — Linh kiện & PC Gaming" disabled={!canManage} />
                    <TextareaField label="Mô tả meta" settingKey="seo.description" values={values} onChange={change} maxLength={160} placeholder="Chuyên cung cấp linh kiện máy tính chính hãng..." rows={3} disabled={!canManage} />
                    <TextField label="Từ khoá meta" settingKey="seo.keywords" values={values} onChange={change} maxLength={200} placeholder="linh kiện máy tính, PC gaming, build pc" disabled={!canManage} />
                    <div>
                      <SelectField label="Múi giờ" settingKey="general.timezone" values={values} onChange={change} options={TIMEZONES} disabled={!canManage} />
                      <ClockPreview timezone={values['general.timezone'] ?? 'Asia/Ho_Chi_Minh'} />
                    </div>
                    <SelectField label="Đơn vị tiền tệ" settingKey="general.currency" values={values} onChange={change} options={CURRENCIES} disabled={!canManage} />
                    <SelectField label="Định dạng ngày" settingKey="general.date_format" values={values} onChange={change} options={DATE_FORMATS} disabled={!canManage} />
                  </div>
                  {canManage && currentTabDirty && (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Thanh toán ─────────────────────────────────────── */}
              {activeTab === 'payment' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle icon={CreditCard} title="Phương thức thanh toán" />
                  <p className="mb-4 text-xs text-slate-500">Quản lý trạng thái các cổng thanh toán. Phương thức ở trạng thái &ldquo;Bảo trì&rdquo; sẽ hiển thị thông báo cho khách hàng.</p>
                  <div className="space-y-4">
                    {PAYMENT_METHODS.map(m => (
                      <PaymentMethodCard key={m.key} method={m} values={values} onChange={change} canManage={canManage} />
                    ))}
                  </div>
                  {canManage && currentTabDirty && (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                  {!canManage && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                      <Lock className="h-3 w-3" /> Bạn chỉ có quyền xem. Liên hệ quản trị viên cấp cao để chỉnh sửa.
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Hệ thống ──────────────────────────────────────── */}
              {activeTab === 'system' && (
                <div className="space-y-4">
                  {/* Maintenance mode card */}
                  <div className={`rounded-2xl border p-6 shadow-sm transition-colors ${maintenanceOn ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
                    <SectionTitle icon={Shield} title="Chế độ bảo trì" />

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Bảo trì hệ thống</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Khi bật, toàn bộ website sẽ hiển thị trang bảo trì cho khách hàng. Admin vẫn truy cập bình thường.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => canManage && change('system.maintenance_mode', maintenanceOn ? 'false' : 'true')}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${maintenanceOn ? 'bg-red-500' : 'bg-slate-300'} ${!canManage ? 'cursor-not-allowed opacity-50' : ''}`}
                        aria-checked={maintenanceOn}
                        role="switch"
                      >
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${maintenanceOn ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {maintenanceOn && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <p className="text-xs font-medium text-red-700">
                          Website đang ở chế độ bảo trì. Khách hàng không thể truy cập.
                        </p>
                      </div>
                    )}

                    <div className="mt-5">
                      <TextareaField
                        label="Thông báo bảo trì (hiển thị cho khách hàng)"
                        settingKey="system.maintenance_message"
                        values={values}
                        onChange={change}
                        maxLength={500}
                        placeholder="Website đang được bảo trì, vui lòng quay lại sau..."
                        rows={3}
                        disabled={!canManage}
                      />
                    </div>
                  </div>

                  {canManage && currentTabDirty && (
                    <div className="flex">
                      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  )}
                  {!canManage && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Lock className="h-3 w-3" /> Bạn chỉ có quyền xem. Liên hệ quản trị viên cấp cao để chỉnh sửa.
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </section>
    </AdminGuard>
  );
}
