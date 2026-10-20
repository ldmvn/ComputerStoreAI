'use client';

import { useEffect, useState, useRef } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionStore } from '@/store/permission.store';
import {
  Loader2, Save, Send, Phone, Mail, CheckCircle2,
  XCircle, AlertCircle, Info, Lock, Bell, MessageCircle, ExternalLink,
} from 'lucide-react';
import {
  getAdminSettings,
  updateAdminSettings,
  getSmtpStatus,
  sendTestEmail,
  type StoreSettings,
  type SmtpStatus,
} from '@/services/adminSettings.service';

// ─── Validation helpers ──────────────────────────────────────────────────────

const VN_PHONE = /^(0[3-9]\d{8}|\+84[3-9]\d{8})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePhone(v: string) {
  if (!v) return null;
  if (!VN_PHONE.test(v.replace(/\s/g, ''))) return 'Số điện thoại không hợp lệ (VD: 0386220065)';
  return null;
}
function validateEmail(v: string) {
  if (!v) return null;
  if (!EMAIL_RE.test(v.trim())) return 'Địa chỉ email không hợp lệ';
  return null;
}

const SOCIAL_ALLOWED: Record<string, string[]> = {
  zalo:      ['zalo.me'],
  messenger: ['m.me', 'www.messenger.com', 'messenger.com'],
  telegram:  ['t.me', 'telegram.me', 'telegram.org'],
};

function validateSocialUrl(channel: string, v: string): string | null {
  if (!v) return null;
  let parsed: URL;
  try { parsed = new URL(v); } catch { return 'URL không hợp lệ.'; }
  if (parsed.protocol !== 'https:') return 'Chỉ chấp nhận https://.';
  if (parsed.username || parsed.password) return 'URL không được chứa thông tin đăng nhập.';
  const allowed = SOCIAL_ALLOWED[channel] ?? [];
  if (!allowed.includes(parsed.hostname)) return `Domain phải là: ${allowed.join(', ')}.`;
  return null;
}

// ─── Field definitions ────────────────────────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  type: 'tel' | 'email' | 'text';
  placeholder?: string;
  note?: string;
  required?: boolean;
};

const PHONE_FIELDS: FieldDef[] = [
  { key: 'store.phone',            label: 'Hotline chính',              type: 'tel',   placeholder: '0386220065', note: 'Dùng chung với Thông tin cửa hàng' },
  { key: 'contact.phone_sales',    label: 'Hotline tư vấn bán hàng',    type: 'tel',   placeholder: '0386220065' },
  { key: 'contact.phone_support',  label: 'Hotline hỗ trợ kỹ thuật',    type: 'tel',   placeholder: '0386220065' },
  { key: 'contact.phone_warranty', label: 'Hotline bảo hành / đổi trả', type: 'tel',   placeholder: '0386220065' },
];
const EMAIL_FIELDS: FieldDef[] = [
  { key: 'store.email',            label: 'Email liên hệ chính',          type: 'email', placeholder: 'info@ducmanhpc.vn', note: 'Dùng chung với Thông tin cửa hàng' },
  { key: 'contact.email_support',  label: 'Email hỗ trợ khách hàng',      type: 'email', placeholder: 'support@ducmanhpc.vn' },
  { key: 'contact.email_partner',  label: 'Email tiếp nhận hợp tác',      type: 'email', placeholder: 'partner@ducmanhpc.vn' },
  { key: 'contact.sender_name',    label: 'Tên người gửi email hệ thống', type: 'text',  placeholder: 'DUCMANH PC', note: 'Hiển thị trong hộp thư nhận' },
];

const ALL_CONTACT_KEYS = [...PHONE_FIELDS, ...EMAIL_FIELDS].map(f => f.key);

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = 'contact' | 'smtp' | 'notifications' | 'social';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'contact',       label: 'Thông tin liên hệ', icon: Phone },
  { id: 'smtp',          label: 'Email hệ thống',    icon: Mail },
  { id: 'notifications', label: 'Thông báo tự động', icon: Bell },
  { id: 'social',        label: 'Kênh xã hội',       icon: MessageCircle },
];

// Social channel definitions
type SocialChannel = { id: string; label: string; placeholder: string; hint: string };

const SOCIAL_CHANNELS: SocialChannel[] = [
  { id: 'zalo',      label: 'Zalo',      placeholder: 'https://zalo.me/0386220065', hint: 'zalo.me' },
  { id: 'messenger', label: 'Messenger', placeholder: 'https://m.me/ldmahz',        hint: 'm.me / messenger.com' },
  { id: 'telegram',  label: 'Telegram',  placeholder: 'https://t.me/ldmahz',        hint: 't.me / telegram.me' },
];

const SOCIAL_KEYS = SOCIAL_CHANNELS.flatMap(c => [`social.${c.id}.url`, `social.${c.id}.enabled`]);

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
      <Icon className="h-4 w-4 text-primary-600" />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
    </div>
  );
}

function FieldRow({ field, value, error, onChange, disabled }: {
  field: FieldDef;
  value: string;
  error: string | null;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}
          disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {field.note && !error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <Info className="h-3 w-3 flex-shrink-0" />
          {field.note}
        </p>
      )}
    </div>
  );
}

function SmtpStatusCard({ smtp }: { smtp: SmtpStatus | null }) {
  if (!smtp) return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra cấu hình SMTP…
    </div>
  );

  const ok = smtp.configured && !smtp.lastError;

  return (
    <div className={`rounded-xl border px-4 py-4 text-sm
      ${ok ? 'border-emerald-200 bg-emerald-50' : smtp.configured ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="mb-3 flex items-center gap-2">
        {ok
          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          : smtp.configured
          ? <AlertCircle className="h-4 w-4 text-amber-500" />
          : <XCircle className="h-4 w-4 text-slate-400" />
        }
        <span className={`font-semibold ${ok ? 'text-emerald-700' : smtp.configured ? 'text-amber-700' : 'text-slate-600'}`}>
          {ok ? 'SMTP đã kết nối' : smtp.configured ? 'SMTP được cấu hình nhưng có lỗi' : 'SMTP chưa được cấu hình'}
        </span>
      </div>
      {smtp.configured && (
        <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
          {smtp.host && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="font-medium">Host:</span> {smtp.host}:{smtp.port}
            </div>
          )}
          {smtp.from && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="font-medium">From:</span> {smtp.from}
            </div>
          )}
          {smtp.lastError && (
            <div className="col-span-2 mt-1 flex items-center gap-1.5 text-amber-700">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              Lỗi kết nối: <code className="rounded bg-amber-100 px-1">{smtp.lastError}</code>
            </div>
          )}
        </div>
      )}
      {!smtp.configured && (
        <p className="mt-1 text-xs text-slate-500">
          Cấu hình SMTP trong file <code className="rounded bg-slate-100 px-1 text-slate-700">backend/.env</code> để bật tính năng gửi email.
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactSettingsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const canManage = usePermissionStore(s => s.has('settings', 'manage'));

  const [activeTab, setActiveTab] = useState<TabId>('contact');
  const [values, setValues] = useState<StoreSettings>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackErr, setFeedbackErr] = useState('');

  const [smtp, setSmtp] = useState<SmtpStatus | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testToErr, setTestToErr] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const testResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      getAdminSettings(token, ctrl.signal),
      getSmtpStatus(token, ctrl.signal),
    ])
      .then(([settingsRes, smtpRes]) => {
        setValues(settingsRes.data ?? {});
        setSmtp(smtpRes.data ?? null);
      })
      .catch(e => { if (e.name !== 'AbortError') setFeedbackErr(e.message); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [isHydrated, token]);

  function handleChange(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }));
    const def = [...PHONE_FIELDS, ...EMAIL_FIELDS].find(f => f.key === key);
    if (!def) return;
    const err = def.type === 'tel' ? validatePhone(val) : def.type === 'email' ? validateEmail(val) : null;
    setErrors(e => ({ ...e, [key]: err }));
  }

  function validate() {
    const next: Record<string, string | null> = {};
    for (const f of [...PHONE_FIELDS, ...EMAIL_FIELDS]) {
      const val = values[f.key] ?? '';
      next[f.key] = f.type === 'tel' ? validatePhone(val) : f.type === 'email' ? validateEmail(val) : null;
    }
    setErrors(next);
    return Object.values(next).every(e => !e);
  }

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setFeedbackMsg(''); setFeedbackErr('');
    const payload: StoreSettings = {};
    for (const key of ALL_CONTACT_KEYS) payload[key] = values[key] ?? '';
    try {
      await updateAdminSettings(token, payload);
      setFeedbackMsg('Đã lưu thông tin liên hệ.');
    } catch (e) {
      setFeedbackErr(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally { setSaving(false); }
  };

  const handleSaveSocial = async () => {
    // validate all social URLs before saving
    const urlErrors: Record<string, string | null> = {};
    for (const ch of SOCIAL_CHANNELS) {
      const key = `social.${ch.id}.url`;
      urlErrors[key] = validateSocialUrl(ch.id, values[key] ?? '');
    }
    setErrors(e => ({ ...e, ...urlErrors }));
    if (Object.values(urlErrors).some(Boolean)) return;

    setSaving(true); setFeedbackMsg(''); setFeedbackErr('');
    const payload: StoreSettings = {};
    for (const key of SOCIAL_KEYS) payload[key] = values[key] ?? '';
    try {
      await updateAdminSettings(token, payload);
      setFeedbackMsg('Đã lưu cài đặt kênh xã hội.');
    } catch (e) {
      setFeedbackErr(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    if (!EMAIL_RE.test(testTo.trim())) { setTestToErr('Nhập email hợp lệ.'); return; }
    setTestToErr('');
    setTestSending(true);
    setTestResult(null);
    if (testResultTimer.current) clearTimeout(testResultTimer.current);
    try {
      const res = await sendTestEmail(token, testTo.trim());
      setTestResult({ ok: true, msg: res.message });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Không gửi được email.' });
    } finally {
      setTestSending(false);
      testResultTimer.current = setTimeout(() => setTestResult(null), 8000);
    }
  };

  return (
    <AdminGuard permission="settings:view">
      <section>
        <AdminPageHeader title="Email / Hotline" />
        <AdminFeedback message={feedbackMsg} error={feedbackErr} />

        {/* Tab bar */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex gap-0 overflow-x-auto">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                    ${active
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="max-w-3xl">

            {/* ── Tab: Thông tin liên hệ ───────────────────────────────── */}
            {activeTab === 'contact' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionTitle icon={Phone} title="Thông tin liên hệ" />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Số điện thoại</p>
                    {PHONE_FIELDS.map(f => (
                      <FieldRow
                        key={f.key}
                        field={f}
                        value={values[f.key] ?? ''}
                        error={errors[f.key] ?? null}
                        onChange={v => handleChange(f.key, v)}
                        disabled={!canManage}
                      />
                    ))}
                  </div>
                  <div className="space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Địa chỉ email</p>
                    {EMAIL_FIELDS.map(f => (
                      <FieldRow
                        key={f.key}
                        field={f}
                        value={values[f.key] ?? ''}
                        error={errors[f.key] ?? null}
                        onChange={v => handleChange(f.key, v)}
                        disabled={!canManage}
                      />
                    ))}
                  </div>
                </div>

                {canManage && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <button
                      onClick={handleSave}
                      disabled={saving || Object.values(errors).some(Boolean)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition"
                    >
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

            {/* ── Tab: Email hệ thống (SMTP) ───────────────────────────── */}
            {activeTab === 'smtp' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionTitle icon={Mail} title="Email hệ thống" />

                <SmtpStatusCard smtp={smtp} />

                {smtp?.configured && (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs text-slate-500">
                      Cấu hình SMTP được quản lý qua file <code className="rounded bg-slate-100 px-1 text-slate-700">backend/.env</code> để bảo đảm an toàn. Không có mật khẩu SMTP nào được lưu trong database.
                    </p>

                    {canManage && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-3 text-sm font-medium text-slate-700">Gửi email thử nghiệm</p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex-1 min-w-48">
                            <input
                              type="email"
                              value={testTo}
                              onChange={e => { setTestTo(e.target.value); setTestToErr(''); setTestResult(null); }}
                              placeholder="email@example.com"
                              disabled={testSending}
                              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition
                                ${testToErr ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}
                                disabled:bg-slate-50 disabled:text-slate-400`}
                            />
                            {testToErr && <p className="mt-1 text-xs text-red-500">{testToErr}</p>}
                          </div>
                          <button
                            onClick={handleTestEmail}
                            disabled={testSending || !testTo}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 transition"
                          >
                            {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Gửi thử
                          </button>
                        </div>
                        {testResult && (
                          <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm
                            ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {testResult.ok
                              ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                            {testResult.msg}
                          </div>
                        )}
                      </div>
                    )}
                    {!canManage && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Lock className="h-3 w-3" /> Gửi email thử yêu cầu quyền <code>settings:manage</code>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Kênh xã hội ─────────────────────────────────────── */}
            {activeTab === 'social' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionTitle icon={MessageCircle} title="Kênh xã hội & Widget hỗ trợ" />
                <p className="mb-5 text-xs text-slate-500">
                  Cấu hình link và trạng thái hiển thị của từng kênh trong widget hỗ trợ trên trang khách hàng.
                </p>

                <div className="space-y-5">
                  {SOCIAL_CHANNELS.map(ch => {
                    const urlKey = `social.${ch.id}.url`;
                    const enabledKey = `social.${ch.id}.enabled`;
                    const isEnabled = values[enabledKey] !== 'false';
                    const urlVal = values[urlKey] ?? '';
                    const urlErr = errors[urlKey] ?? null;

                    return (
                      <div key={ch.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-700">{ch.label}</span>
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => setValues(v => ({ ...v, [enabledKey]: isEnabled ? 'false' : 'true' }))}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed
                              ${isEnabled ? 'bg-primary-600' : 'bg-slate-300'}`}
                            aria-pressed={isEnabled}
                            aria-label={`${isEnabled ? 'Tắt' : 'Bật'} ${ch.label}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={urlVal}
                              onChange={e => {
                                const v = e.target.value;
                                setValues(prev => ({ ...prev, [urlKey]: v }));
                                setErrors(prev => ({ ...prev, [urlKey]: validateSocialUrl(ch.id, v) }));
                              }}
                              placeholder={ch.placeholder}
                              disabled={!canManage || !isEnabled}
                              className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition
                                ${urlErr ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}
                                disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                            />
                            {urlVal && !urlErr && (
                              <a
                                href={urlVal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-primary-600"
                                title="Mở link"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          {urlErr && <p className="mt-1 text-xs text-red-500">{urlErr}</p>}
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <Info className="h-3 w-3 flex-shrink-0" />
                            Chỉ chấp nhận domain: {ch.hint}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {canManage && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <button
                      onClick={handleSaveSocial}
                      disabled={saving || Object.values(errors).some(Boolean)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Lưu thay đổi
                    </button>
                  </div>
                )}
                {!canManage && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                    <Lock className="h-3 w-3" /> Bạn chỉ có quyền xem.
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Thông báo tự động ────────────────────────────────── */}
            {activeTab === 'notifications' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <SectionTitle icon={Bell} title="Thông báo tự động" />
                <p className="mb-4 text-xs text-slate-500">Các luồng email đang hoạt động trong hệ thống:</p>
                <div className="space-y-2">
                  <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Quên mật khẩu / OTP</p>
                      <p className="mt-0.5 text-xs text-slate-500">Gửi mã xác nhận khi khách hàng đặt lại mật khẩu.</p>
                    </div>
                    <span className={`mt-0.5 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold
                      ${smtp?.configured && !smtp?.lastError ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {smtp?.configured && !smtp?.lastError ? 'Đang hoạt động' : 'Chờ SMTP'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Phản hồi phiếu hỗ trợ</p>
                      <p className="mt-0.5 text-xs text-slate-500">Email gửi cho khách khi admin trả lời phiếu hỗ trợ kỹ thuật.</p>
                    </div>
                    <span className={`mt-0.5 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold
                      ${smtp?.configured && !smtp?.lastError ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {smtp?.configured && !smtp?.lastError ? 'Đang hoạt động' : 'Chờ SMTP'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Xác nhận đặt hàng</p>
                      <p className="mt-0.5 text-xs text-slate-500">Email xác nhận gửi cho khách sau khi đặt hàng thành công.</p>
                    </div>
                    <span className="mt-0.5 flex-shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                      Chưa triển khai
                    </span>
                  </div>
                  <div className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Cập nhật trạng thái đơn hàng</p>
                      <p className="mt-0.5 text-xs text-slate-500">Thông báo khi đơn hàng được giao hoặc hoàn tiền.</p>
                    </div>
                    <span className="mt-0.5 flex-shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                      Chưa triển khai
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </section>
    </AdminGuard>
  );
}
