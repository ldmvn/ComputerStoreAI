'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin, ChevronRight, Plus, Home, Briefcase, Star, Pencil, Trash2,
  AlertCircle, RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress,
} from '@/services/address.service';
import type { Address, AddressInput } from '@/types/address.type';
import AddressForm from './AddressForm';

// ─── helpers ──────────────────────────────────────────────────────────────────

function typeLabel(t: string) { return t === 'OFFICE' ? 'Văn phòng' : 'Nhà riêng'; }
function typeIcon(t: string) { return t === 'OFFICE' ? Briefcase : Home; }

// ─── address card ──────────────────────────────────────────────────────────────

function AddressCard({ addr, onEdit, onDelete, onSetDefault, settingDefault }: {
  addr: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  settingDefault: boolean;
}) {
  const Icon = typeIcon(addr.addressType);
  return (
    <div className={`rounded-xl border bg-white p-4 transition ${addr.isDefault ? 'border-primary-300 ring-1 ring-primary-200' : 'border-slate-200'}`}>
      <div className="flex gap-3">
        {/* Icon */}
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-800">{addr.fullName}</p>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
              {typeLabel(addr.addressType)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{addr.phone}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {addr.streetAddress}, {addr.communeName}, {addr.provinceName}
          </p>
        </div>

        {/* Right column: badge + actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {addr.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              <Star className="h-3 w-3" /> Mặc định
            </span>
          ) : (
            <button
              onClick={onSetDefault}
              disabled={settingDefault}
              className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
            >
              <Star className="h-3 w-3" />
              {settingDefault ? 'Đang đặt...' : 'Đặt mặc định'}
            </button>
          )}
          <div className="flex items-center gap-1 border-t border-slate-100 pt-2">
            <button onClick={onEdit}
              className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Pencil className="h-3 w-3" /> Sửa
            </button>
            <button onClick={onDelete}
              aria-label={`Xóa địa chỉ ${addr.fullName}`}
              className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-3 w-3" /> Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AddressesPage() {
  const { user, token } = useAuthStore();
  const toast   = useToast();
  const confirm = useConfirm();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Address | null>(null);
  const [settingId, setSettingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAddresses(await getAddresses(token)); }
    catch { setError('Không thể tải danh sách địa chỉ.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (input: AddressInput) => {
    try {
      let updated: Address;
      if (editing) {
        updated = await updateAddress(token, editing.id, input);
        setAddresses(prev => {
          const list = input.isDefault
            ? prev.map(a => ({ ...a, isDefault: a.id === updated.id }))
            : prev.map(a => a.id === updated.id ? updated : a);
          return list.sort((a, b) => +b.isDefault - +a.isDefault);
        });
        toast.success('Đã cập nhật địa chỉ.');
      } else {
        updated = await createAddress(token, input);
        setAddresses(prev => {
          const list = input.isDefault
            ? prev.map(a => ({ ...a, isDefault: false }))
            : [...prev];
          return [...list, updated].sort((a, b) => +b.isDefault - +a.isDefault);
        });
        toast.success('Đã thêm địa chỉ.');
      }
      setFormOpen(false); setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
    }
  };

  const handleDelete = async (id: number) => {
    const target = addresses.find(a => a.id === id);
    const wasDefault = target?.isDefault ?? false;
    const ok = await confirm({
      title: 'Xóa địa chỉ',
      description: wasDefault
        ? 'Đây là địa chỉ mặc định của bạn. Sau khi xóa, hãy chọn địa chỉ mặc định mới trước khi đặt hàng.'
        : 'Bạn có chắc muốn xóa địa chỉ này không?',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAddress(token, id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success(wasDefault ? 'Đã xóa địa chỉ mặc định. Vui lòng đặt địa chỉ mặc định mới.' : 'Đã xóa địa chỉ.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa.');
    }
  };

  const handleSetDefault = async (id: number) => {
    setSettingId(id);
    try {
      const updated = await setDefaultAddress(token, id);
      setAddresses(prev =>
        prev.map(a => ({ ...a, isDefault: a.id === updated.id }))
          .sort((a, b) => +b.isDefault - +a.isDefault)
      );
      toast.success('Đã đặt làm địa chỉ mặc định.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đặt mặc định.');
    } finally { setSettingId(null); }
  };

  if (!user) return null;

  const stats = [
    { label: 'Tổng địa chỉ',  value: addresses.length },
    { label: 'Nhà riêng',     value: addresses.filter(a => a.addressType === 'HOME').length },
    { label: 'Văn phòng',     value: addresses.filter(a => a.addressType === 'OFFICE').length },
  ];

  return (
    <>
      {/* Address form modal */}
      {formOpen && (
        <AddressForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href="/customer/profile" className="hover:text-primary-600">Tài khoản</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="text-slate-700">Địa chỉ của tôi</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Địa chỉ của tôi</h1>
              <p className="text-sm text-slate-500">Quản lý địa chỉ giao hàng</p>
            </div>
          </div>
          {addresses.length > 0 && (
            <button onClick={() => { setEditing(null); setFormOpen(true); }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              <Plus className="h-4 w-4" /> Thêm địa chỉ
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-y border-slate-200">
          {loading ? (
            [1,2,3].map((_, i) => (
              <div key={i} className={`px-5 py-4 ${i < 2 ? 'border-r border-slate-200' : ''}`}>
                <div className="h-7 w-8 animate-pulse rounded bg-slate-100" />
                <div className="mt-1.5 h-3.5 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))
          ) : stats.map((s, i) => (
            <div key={s.label} className={`px-5 py-4 ${i < 2 ? 'border-r border-slate-200' : ''}`}>
              <p className="text-2xl font-bold tabular-nums text-primary-600">{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-red-300" />
              <p className="mt-3 text-sm text-slate-500">{error}</p>
              <button onClick={load}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          ) : addresses.length === 0 ? (
            <div className="py-12 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <MapPin className="h-8 w-8 text-slate-300" />
              </span>
              <p className="mt-4 font-semibold text-slate-700">Chưa có địa chỉ nào</p>
              <p className="mt-1 text-sm text-slate-400">Thêm địa chỉ để đặt hàng nhanh hơn</p>
              <button onClick={() => { setEditing(null); setFormOpen(true); }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
                <Plus className="h-4 w-4" /> Thêm địa chỉ đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map(addr => (
                <AddressCard
                  key={addr.id}
                  addr={addr}
                  onEdit={() => { setEditing(addr); setFormOpen(true); }}
                  onDelete={() => handleDelete(addr.id)}
                  onSetDefault={() => handleSetDefault(addr.id)}
                  settingDefault={settingId === addr.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
