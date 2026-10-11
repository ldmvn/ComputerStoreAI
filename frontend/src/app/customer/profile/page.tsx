'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Lock, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { updateProfile, AuthRequestError } from '@/services/auth.service';

const genderOptions = [
  { value: '', label: 'Giới tính' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

export default function AccountPage() {
  const { user, token, setUser } = useAuthStore();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', phone: '', gender: '' });

  if (!user) return null;

  const startEdit = () => {
    setForm({ fullName: user.fullName, phone: user.phone ?? '', gender: (user as { gender?: string }).gender ?? '' });
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setError(''); };

  const handleSave = async () => {
    if (!token) return;
    if (!form.fullName.trim()) { setError('Họ và tên không được để trống.'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await updateProfile(token, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
      } as Parameters<typeof updateProfile>[1]);
      setUser(updated);
      setEditing(false);
      toast.success('Đã lưu thông tin tài khoản.');
    } catch (err) {
      setError(err instanceof AuthRequestError ? err.message : 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (editable: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none ${
      editable
        ? 'border-slate-300 bg-white text-slate-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
        : 'border-transparent bg-transparent text-slate-800'
    }`;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="text-slate-700">Tài khoản</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Thông tin tài khoản</h1>
            <p className="text-sm text-slate-500">Cập nhật thông tin cá nhân của bạn</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 sm:p-6">
          <form
            onSubmit={e => { e.preventDefault(); if (editing) handleSave(); }}
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className="mb-1 block text-xs font-medium text-slate-500">
                  Họ và tên
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={editing ? form.fullName : user.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  readOnly={!editing}
                  aria-readonly={!editing}
                  placeholder="Nhập họ và tên"
                  className={inputCls(editing)}
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-xs font-medium text-slate-500">
                  Số điện thoại
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={editing ? form.phone : (user.phone ?? '')}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  readOnly={!editing}
                  aria-readonly={!editing}
                  placeholder="Nhập số điện thoại"
                  className={inputCls(editing)}
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-500">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={user.email}
                  readOnly
                  aria-readonly="true"
                  aria-describedby="email-hint"
                  tabIndex={-1}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 cursor-not-allowed"
                />
                <p id="email-hint" className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Lock className="h-3 w-3 shrink-0" aria-hidden="true" /> Email không thể thay đổi
                </p>
              </div>

              <div>
                <label htmlFor="gender" className="mb-1 block text-xs font-medium text-slate-500">
                  Giới tính
                </label>
                <select
                  id="gender"
                  value={editing ? form.gender : ((user as { gender?: string }).gender ?? '')}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  disabled={!editing}
                  aria-disabled={!editing}
                  className={`${inputCls(editing)} appearance-none`}
                >
                  {genderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
              )}
              <button
                type={editing ? 'submit' : 'button'}
                onClick={editing ? undefined : startEdit}
                disabled={saving}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 active:bg-primary-800 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : editing ? 'Lưu thông tin' : 'Chỉnh sửa thông tin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
