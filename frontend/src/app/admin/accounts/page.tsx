'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Activity, Edit2, Loader2, Plus, Search, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionStore } from '@/store/permission.store';
import {
  type Account,
  createAccount, deleteAccount, listAccounts, updateAccount, updateAccountRole,
} from '@/services/accounts.service';
import { type Role, getRoles } from '@/services/rbac.service';

const inputCls = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none';

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

function dateFmt(s: string) {
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type ModalMode = 'create' | 'edit' | 'delete';

function roleLabel(a: Account) {
  if (a.role !== 'ADMIN') return 'Khách hàng';
  return a.adminRole?.name || 'Admin (Toàn quyền)';
}

export default function AccountsPage() {
  const token = useAuthStore(s => s.token);
  const myId = useAuthStore(s => s.user?.id);
  const canManageRoles = usePermissionStore(s => s.has('administrators', 'manage'));
  const toast = useToast();
  const formId = useId();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [modal, setModal] = useState<null | { mode: ModalMode; account?: Account }>(null);
  const [fname, setFname] = useState('');
  const [femail, setFemail] = useState('');
  const [fphone, setFphone] = useState('');
  const [fpw, setFpw] = useState('');
  const [ferror, setFerror] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const filter = filterRole === 'admins' ? 'admins' : filterRole === 'customers' ? 'customers' : undefined;
      const res = await listAccounts(token, { page: p, limit: 15, search: search || undefined, filter });
      setAccounts(res.customers);
      setTotal(res.total);
      setPage(p);
      setTotalPages(Math.ceil(res.total / 15));
    } catch {
      toast.error('Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, [token, search, filterRole, toast]);

  useEffect(() => { void load(1); }, [load]);

  useEffect(() => {
    if (!canManageRoles) return;
    getRoles(token).then(r => setRoles(r.roles.filter(x => x.isActive))).catch(() => {});
  }, [token, canManageRoles]);

  async function handleRoleChange(a: Account, value: string) {
    if (!token) return;
    const newRole: 'USER' | 'ADMIN' = value === 'customer' ? 'USER' : 'ADMIN';
    const adminRoleId = value === 'customer' || value === 'admin_full' ? null : Number(value);
    setRoleBusyId(a.id);
    try {
      await updateAccountRole(token, a.id, { role: newRole, adminRoleId });
      toast.success(`Đã đổi vai trò "${a.fullName}" thành ${newRole === 'USER' ? 'Khách hàng' : roles.find(r => r.id === adminRoleId)?.name || 'Admin (Toàn quyền)'}.`);
      void load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đổi vai trò.');
    } finally {
      setRoleBusyId(null);
    }
  }

  function openCreate() {
    setFname(''); setFemail(''); setFphone(''); setFpw(''); setFerror('');
    setModal({ mode: 'create' });
  }

  function openEdit(a: Account) {
    setFname(a.fullName); setFemail(a.email); setFphone(a.phone ?? ''); setFpw(''); setFerror('');
    setModal({ mode: 'edit', account: a });
  }

  function openDelete(a: Account) {
    setFerror('');
    setModal({ mode: 'delete', account: a });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setFerror('');
    if (!fname.trim() || !femail.trim()) { setFerror('Họ tên và email là bắt buộc.'); return; }
    if (modal.mode === 'create' && !fpw) { setFerror('Mật khẩu là bắt buộc.'); return; }

    setBusy(true);
    try {
      if (modal.mode === 'create') {
        await createAccount(token, { fullName: fname.trim(), email: femail.trim(), phone: fphone.trim() || undefined, password: fpw });
        toast.success('Tạo tài khoản thành công.');
      } else if (modal.mode === 'edit' && modal.account) {
        await updateAccount(token, modal.account.id, {
          fullName: fname.trim(), email: femail.trim(),
          phone: fphone.trim() || undefined,
          ...(fpw ? { password: fpw } : {}),
        });
        toast.success('Cập nhật tài khoản thành công.');
      }
      setModal(null);
      void load(modal.mode === 'create' ? 1 : page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi.';
      setFerror(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!modal?.account) return;
    setBusy(true);
    try {
      await deleteAccount(token, modal.account.id);
      toast.success('Đã xóa tài khoản.');
      setModal(null);
      void load(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi.';
      setFerror(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(a: Account) {
    try {
      await updateAccount(token, a.id, { isActive: !a.isActive });
      toast.success(a.isActive ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
      void load(page);
    } catch {
      toast.error('Không thể cập nhật trạng thái.');
    }
  }

  return (
    <AdminGuard permission="customers:manage">
      <div className="space-y-6">
        <AdminPageHeader
          title="Tài khoản"
          description={`Quản lý toàn bộ tài khoản người dùng (${total} tài khoản)`}
          action={
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <Plus className="h-4 w-4" /> Thêm tài khoản
            </button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none"
              placeholder="Tìm theo tên, email, SĐT..."
              value={search}
              onChange={e => { setSearch(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && load(1)}
            />
          </div>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            <option value="customers">Khách hàng</option>
            <option value="admins">Quản trị viên</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-400">Không có tài khoản nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Tài khoản</th>
                    <th className="px-4 py-3">Liên hệ</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3 text-right">Đơn hàng</th>
                    <th className="px-4 py-3 text-right">Tổng chi</th>
                    <th className="px-4 py-3">Tham gia</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {accounts.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                            {a.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{a.fullName}</p>
                            <p className="text-xs text-slate-400">#{a.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{a.email}</p>
                        {a.phone && <p className="text-xs text-slate-400">{a.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {canManageRoles && a.id !== myId ? (
                          <select
                            disabled={roleBusyId === a.id}
                            value={a.role === 'ADMIN' ? (a.adminRoleId ? String(a.adminRoleId) : 'admin_full') : 'customer'}
                            onChange={e => handleRoleChange(a, e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-primary-400 focus:outline-none disabled:opacity-50"
                          >
                            <option value="customer">Khách hàng</option>
                            <option value="admin_full">Admin (Toàn quyền)</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${a.role === 'ADMIN' ? 'border border-primary-200 bg-primary-50 text-primary-700' : 'border border-slate-200 text-slate-600'}`}>
                            {a.role === 'ADMIN' && <Shield className="h-3 w-3" />}
                            {roleLabel(a)}{a.id === myId && <span className="text-slate-400"> (bạn)</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{a.orderCount ?? 0}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(a.totalSpent ?? 0)}</td>
                      <td className="px-4 py-3 text-slate-500">{dateFmt(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        {a.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <UserCheck className="h-3 w-3" /> Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            <UserX className="h-3 w-3" /> Đã khóa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/accounts/${a.id}/activity`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Lịch sử hoạt động"
                          >
                            <Activity className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(a)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title={a.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {a.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => openEdit(a)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Sửa tài khoản"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDelete(a)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{total} tài khoản</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Trước
              </button>
              <span className="px-2 py-1.5">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && modal.mode !== 'delete' && (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={modal.mode === 'create' ? 'Thêm tài khoản' : 'Sửa tài khoản'}
        >
          <form id={formId} onSubmit={handleSave} className="space-y-4 p-1">
            <div>
              <label className="text-sm font-medium text-slate-700">Họ tên <span className="text-red-500">*</span></label>
              <input className={inputCls} value={fname} onChange={e => setFname(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
              <input className={inputCls} type="email" value={femail} onChange={e => setFemail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
              <input className={inputCls} value={fphone} onChange={e => setFphone(e.target.value)} placeholder="0901234567" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Mật khẩu {modal.mode === 'create' && <span className="text-red-500">*</span>}
                {modal.mode === 'edit' && <span className="ml-1 text-xs text-slate-400">(bỏ trống để giữ nguyên)</span>}
              </label>
              <input className={inputCls} type="password" value={fpw} onChange={e => setFpw(e.target.value)} placeholder={modal.mode === 'edit' ? '••••••••' : 'Mật khẩu'} />
            </div>
            {ferror && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{ferror}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Hủy</button>
              <button type="submit" form={formId} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {modal.mode === 'create' ? 'Tạo tài khoản' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {modal?.mode === 'delete' && (
        <Modal isOpen onClose={() => setModal(null)} title="Xóa tài khoản">
          <div className="space-y-4 p-1">
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa tài khoản <strong>{modal.account?.fullName}</strong> ({modal.account?.email})?
              Hành động này không thể hoàn tác.
            </p>
            {ferror && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{ferror}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Hủy</button>
              <button onClick={handleDelete} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Xóa tài khoản
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminGuard>
  );
}
