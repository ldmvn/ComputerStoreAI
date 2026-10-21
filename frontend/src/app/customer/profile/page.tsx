'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Lock, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { updateProfile, AuthRequestError } from '@/services/auth.service';

const GENDER_OPTIONS = [
  { value: '', label: 'Chưa chọn' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const VN_PHONE_RE = /^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;

function validatePhone(phone: string): string {
  if (!phone) return '';
  if (!VN_PHONE_RE.test(phone.replace(/\s/g, ''))) return 'Số điện thoại không hợp lệ (VD: 0912345678).';
  return '';
}

export default function AccountPage() {
  const { user, setUser } = useAuthStore();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [form, setForm] = useState({ fullName: '', phone: '', gender: '' });

  if (!user) return null;

  const startEdit = () => {
    setForm({
      fullName: user.fullName,
      phone: user.phone ?? '',
      gender: user.gender ?? '',
    });
    setFormError('');
    setFieldErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormError('');
    setFieldErrors({});
  };

  const handleSave = async () => {
    const errors: typeof fieldErrors = {};
    if (!form.fullName.trim()) errors.fullName = 'Họ và tên không được để trống.';
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.phone = phoneErr;
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      const updated = await updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
      });
      setUser(updated);
      setEditing(false);
      toast.success('Đã lưu thông tin tài khoản.');
    } catch (err) {
      if (err instanceof AuthRequestError && err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFormError(err instanceof AuthRequestError ? err.message : 'Không thể lưu thông tin. Vui lòng thử lại.');
      }
    } finally {
      setSaving(false);
    }
  };

  const viewCls = 'w-full rounded-xl border border-transparent bg-transparent px-4 py-3 text-sm text-slate-800';
  const editCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="text-slate-700">Tài khoản</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Thông tin tài khoản</h1>
            <p className="text-sm text-slate-500">Cập nhật thông tin cá nhân của bạn</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <form onSubmit={e => { e.preventDefault(); if (editing) void handleSave(); }} noValidate>
            <div className="grid gap-5 sm:grid-cols-2">

              {/* Họ và tên */}
              <div>
                <label htmlFor="fullName" className="mb-1 block text-xs font-medium text-slate-500">
                  Họ và tên <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={editing ? form.fullName : user.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  readOnly={!editing}
                  aria-readonly={!editing}
                  maxLength={100}
                  placeholder="Nhập họ và tên"
                  className={editing ? editCls : viewCls}
                  aria-describedby={fieldErrors.fullName ? 'fullName-err' : undefined}
                  aria-invalid={!!fieldErrors.fullName}
                />
                {fieldErrors.fullName && (
                  <p id="fullName-err" role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Số điện thoại */}
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
                  className={editing ? editCls : viewCls}
                  aria-describedby={fieldErrors.phone ? 'phone-err' : undefined}
                  aria-invalid={!!fieldErrors.phone}
                />
                {fieldErrors.phone && (
                  <p id="phone-err" role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Email — chỉ đọc */}
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
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400"
                />
                <p id="email-hint" className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Lock className="h-3 w-3 shrink-0" aria-hidden="true" /> Email không thể thay đổi
                </p>
              </div>

              {/* Giới tính */}
              <div>
                <label htmlFor="gender" className="mb-1 block text-xs font-medium text-slate-500">
                  Giới tính
                </label>
                {editing ? (
                  <select
                    id="gender"
                    value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className={`${editCls} appearance-none`}
                  >
                    {GENDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="gender"
                    type="text"
                    value={GENDER_OPTIONS.find(o => o.value === (user.gender ?? ''))?.label ?? 'Chưa chọn'}
                    readOnly
                    aria-readonly="true"
                    className={viewCls}
                  />
                )}
              </div>
            </div>

            {formError && (
              <p role="alert" className="mt-4 text-sm text-red-600">{formError}</p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 active:bg-primary-800 disabled:opacity-60"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 active:bg-primary-800"
                >
                  Chỉnh sửa thông tin
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
