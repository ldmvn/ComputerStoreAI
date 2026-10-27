'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Home, Briefcase, Search, ChevronDown, Loader2 } from 'lucide-react';
import { getProvinces, getCommunes } from '@/services/address.service';
import type { Address, AddressInput, AddressType, Province, Commune } from '@/types/address.type';

// ─── normalise Vietnamese for search ──────────────────────────────────────────

function normalize(s: string) {
  // NFD decomposes Vietnamese characters; ̀-ͯ removes all combining diacritics
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ─── searchable dropdown ───────────────────────────────────────────────────────

function Dropdown<T extends { code: string; name: string }>({
  label, placeholder, items, value, onChange, loading, disabled,
}: {
  label: string; placeholder: string;
  items: T[]; value: string;
  onChange: (item: T) => void;
  loading?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = q
    ? items.filter(it => normalize(it.name).includes(normalize(q)))
    : items;

  const selected = items.find(it => it.code === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(v => !v)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
          disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
        }`}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {loading ? 'Đang tải...' : selected ? selected.name : placeholder}
        </span>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && !disabled && !loading && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">Không tìm thấy kết quả</li>
            ) : filtered.map(it => (
              <li key={it.code}>
                <button
                  type="button"
                  onClick={() => { onChange(it); setOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${it.code === value ? 'font-medium text-primary-600' : 'text-slate-700'}`}
                >
                  {it.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── main form ────────────────────────────────────────────────────────────────

const PHONE_RE = /^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;

interface Props {
  initial: Address | null;
  onSave: (input: AddressInput) => Promise<void>;
  onClose: () => void;
}

export default function AddressForm({ initial, onSave, onClose }: Props) {
  const [fullName, setFullName]         = useState(initial?.fullName ?? '');
  const [phone, setPhone]               = useState(initial?.phone ?? '');
  const [addressType, setAddressType]   = useState<AddressType>(initial?.addressType ?? 'HOME');
  const [isDefault, setIsDefault]       = useState(initial?.isDefault ?? false);
  const [streetAddress, setStreetAddress] = useState(initial?.streetAddress ?? '');

  const [provinces, setProvinces]       = useState<Province[]>([]);
  const [communes, setCommunes]         = useState<Commune[]>([]);
  const [provinceCode, setProvinceCode] = useState(initial?.provinceCode ?? '');
  const [provinceName, setProvinceName] = useState(initial?.provinceName ?? '');
  const [communeCode, setCommuneCode]   = useState(initial?.communeCode ?? '');
  const [communeName, setCommuneName]   = useState(initial?.communeName ?? '');

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCommunes, setLoadingCommunes]   = useState(false);
  const [provinceError, setProvinceError]       = useState<string | null>(null);
  const [communeError, setCommuneError]         = useState<string | null>(null);

  const [errors, setErrors]   = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load provinces on mount
  useEffect(() => {
    setLoadingProvinces(true);
    getProvinces()
      .then(setProvinces)
      .catch(() => setProvinceError('Không tải được danh sách tỉnh/thành.'))
      .finally(() => setLoadingProvinces(false));
  }, []);

  // Load communes when province changes
  useEffect(() => {
    if (!provinceCode) { setCommunes([]); setCommuneError(null); return; }
    setLoadingCommunes(true);
    setCommuneError(null);
    getCommunes(provinceCode)
      .then(list => { setCommunes(list); })
      .catch(() => setCommuneError('Không tải được danh sách phường/xã. Vui lòng thử lại.'))
      .finally(() => setLoadingCommunes(false));
  }, [provinceCode]);

  const handleProvinceChange = (p: Province) => {
    setProvinceCode(p.code); setProvinceName(p.name);
    setCommuneCode(''); setCommuneName('');
  };

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên.';
    if (!phone.trim() || !PHONE_RE.test(phone.trim())) e.phone = 'Số điện thoại không hợp lệ.';
    if (!provinceCode) e.province = 'Vui lòng chọn tỉnh/thành phố.';
    if (!communeCode) e.commune = 'Vui lòng chọn phường/xã.';
    if (!streetAddress.trim()) e.streetAddress = 'Vui lòng nhập địa chỉ cụ thể.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setApiError(null);
    try {
      await onSave({ fullName: fullName.trim(), phone: phone.trim(), provinceCode, provinceName, communeCode, communeName, streetAddress: streetAddress.trim(), addressType, isDefault });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-800">{initial ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 px-5 py-5">

            {/* Recipient */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Thông tin người nhận</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Họ và tên <span className="text-red-500">*</span></label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition placeholder-slate-400 focus:ring-2 focus:ring-primary-500/20 ${errors.fullName ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary-400'}`}
                  />
                  {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Số điện thoại <span className="text-red-500">*</span></label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="0912345678" type="tel"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition placeholder-slate-400 focus:ring-2 focus:ring-primary-500/20 ${errors.phone ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary-400'}`}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Địa chỉ</p>
              {provinceError && (
                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{provinceError}</p>
              )}
              <div className="space-y-3">
                <Dropdown
                  label="Tỉnh/Thành phố *"
                  placeholder="Chọn tỉnh/thành phố"
                  items={provinces}
                  value={provinceCode}
                  onChange={handleProvinceChange}
                  loading={loadingProvinces}
                />
                {errors.province && <p className="-mt-2 text-xs text-red-500">{errors.province}</p>}

                <Dropdown
                  label="Phường/Xã *"
                  placeholder={provinceCode ? 'Chọn phường/xã' : 'Chọn tỉnh/thành trước'}
                  items={communes}
                  value={communeCode}
                  onChange={c => { setCommuneCode(c.code); setCommuneName(c.name); }}
                  loading={loadingCommunes}
                  disabled={!provinceCode}
                />
                {communeError && (
                  <div className="-mt-1 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span className="flex-1">{communeError}</span>
                    <button
                      type="button"
                      onClick={() => { const code = provinceCode; setProvinceCode(''); setTimeout(() => setProvinceCode(code), 0); }}
                      className="shrink-0 font-semibold underline hover:no-underline"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
                {errors.commune && <p className="-mt-2 text-xs text-red-500">{errors.commune}</p>}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Địa chỉ cụ thể <span className="text-red-500">*</span></label>
                  <textarea
                    value={streetAddress}
                    onChange={e => setStreetAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, tòa nhà..."
                    rows={2}
                    className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none transition placeholder-slate-400 focus:ring-2 focus:ring-primary-500/20 ${errors.streetAddress ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary-400'}`}
                  />
                  {errors.streetAddress && <p className="mt-1 text-xs text-red-500">{errors.streetAddress}</p>}
                </div>
              </div>
            </div>

            {/* Address type */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Loại địa chỉ</p>
              <div className="grid grid-cols-2 gap-3">
                {(['HOME', 'OFFICE'] as AddressType[]).map(t => {
                  const Icon = t === 'HOME' ? Home : Briefcase;
                  const label = t === 'HOME' ? 'Nhà riêng' : 'Văn phòng';
                  const active = addressType === t;
                  return (
                    <button key={t} type="button" onClick={() => setAddressType(t)}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition ${active ? 'border-primary-400 bg-primary-50 text-primary-700 ring-1 ring-primary-300' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <Icon className={`h-4 w-4 ${active ? 'text-primary-600' : 'text-slate-400'}`} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default */}
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-primary-600"
              />
              <span className="text-sm text-slate-700">Đặt làm địa chỉ mặc định</span>
            </label>

            {apiError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{apiError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              {saving ? 'Đang lưu...' : 'Lưu địa chỉ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
