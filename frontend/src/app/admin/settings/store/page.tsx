'use client';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { getAdminSettings, updateAdminSettings, type StoreSettings } from '@/services/adminSettings.service';

const FIELDS: Array<{ key: string; label: string; placeholder?: string; type?: 'url' | 'text' }> = [
  { key: 'store.name',       label: 'Tên cửa hàng',        placeholder: 'DUCMANH PC' },
  { key: 'store.address',    label: 'Địa chỉ',              placeholder: '...' },
  { key: 'store.phone',      label: 'Số điện thoại',        placeholder: '0123 456 789' },
  { key: 'store.email',      label: 'Email',                placeholder: 'info@...' },
  { key: 'store.logoUrl',    label: 'URL Logo',             placeholder: '/logo.png', type: 'url' },
  { key: 'social.facebook',  label: 'Facebook',             placeholder: 'https://facebook.com/...', type: 'url' },
  { key: 'social.youtube',   label: 'YouTube',              placeholder: 'https://youtube.com/...', type: 'url' },
  { key: 'social.instagram', label: 'Instagram',            placeholder: 'https://instagram.com/...', type: 'url' },
  { key: 'social.tiktok',    label: 'TikTok',               placeholder: 'https://tiktok.com/...', type: 'url' },
  { key: 'footer.copyright', label: 'Bản quyền Footer',     placeholder: '© 2024 DUCMANH PC' },
  { key: 'footer.developer', label: 'Ghi chú nhà phát triển', placeholder: 'Developed by ...' },
];

export default function StoreSettingsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [values, setValues] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    setLoading(true);
    getAdminSettings(token)
      .then(r => setValues(r.data ?? {}))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [isHydrated, token]);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateAdminSettings(token, values);
      setSuccess('Đã lưu cài đặt.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally { setSaving(false); }
  };

  return (
    <AdminGuard permission="settings:view">
      <section>
        <AdminPageHeader title="Thông tin cửa hàng" />
        <AdminFeedback error={error} message={success} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{f.label}</label>
                <input
                  type={f.type === 'url' ? 'url' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            ))}

            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        )}
      </section>
    </AdminGuard>
  );
}
