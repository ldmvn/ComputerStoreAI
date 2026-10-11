'use client';
import AdminGuard from '@/components/admin/AdminGuard';
import { useCallback, useEffect, useId, useState } from 'react';
import { Edit2, Lock, Plus, Shield, Unlock, User } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import {
  type AdminUser, type Role,
  createAdminUser, getAdminUsers, getRoles, setAdminUserStatus, updateAdminUser,
} from '@/services/rbac.service';

const inputCls = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none';

export default function AdminUsersPage() {
  const token = useAuthStore(s => s.token);
  const myId = useAuthStore(s => s.user?.id);
  const toast = useToast();
  const formId = useId();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const [modal, setModal] = useState<undefined | null | number>(undefined);
  const [fname, setFname] = useState('');
  const [femail, setFemail] = useState('');
  const [fphone, setFphone] = useState('');
  const [fpw, setFpw] = useState('');
  const [frole, setFrole] = useState('');
  const [ferror, setFerror] = useState('');

  const load = useCallback(async (p = page) => {
    if (!token) return;
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        getAdminUsers(token, { page: p, limit: 20, search: search || undefined, roleId: filterRole ? Number(filterRole) : undefined, isActive: filterActive !== '' ? filterActive === 'true' : undefined }),
        getRoles(token),
      ]);
      setUsers(u.users); setTotal(u.total); setPage(u.page); setTotalPages(u.totalPages);
      setRoles(r.roles);
    } catch { toast.error('Không tải được dữ liệu.'); }
    finally { setLoading(false); }
  }, [token, page, search, filterRole, filterActive, toast]);

  useEffect(() => { void load(1); }, [token, search, filterRole, filterActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setFname(''); setFemail(''); setFphone(''); setFpw(''); setFrole(''); setFerror(''); setModal(null); };
  const openEdit = (u: AdminUser) => { setFname(u.fullName); setFemail(u.email); setFphone(u.phone || ''); setFpw(''); setFrole(u.adminRoleId ? String(u.adminRoleId) : ''); setFerror(''); setModal(u.id); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true); setFerror('');
    try {
      if (modal === null) {
        if (!fpw || fpw.length < 8) { setFerror('Mật khẩu phải ít nhất 8 ký tự.'); setBusy(false); return; }
        await createAdminUser(token, { fullName: fname.trim(), email: femail.trim(), phone: fphone.trim() || undefined, password: fpw, adminRoleId: frole ? Number(frole) : undefined });
        toast.success('Đã tạo tài khoản.');
      } else {
        await updateAdminUser(token, modal as number, { fullName: fname.trim(), phone: fphone.trim() || undefined, adminRoleId: frole ? Number(frole) : undefined });
        toast.success('Đã cập nhật tài khoản.');
      }
      setModal(undefined); void load(1);
    } catch (err) { setFerror(err instanceof Error ? err.message : 'Lỗi.'); }
    finally { setBusy(false); }
  };

  const toggleStatus = async (u: AdminUser) => {
    if (!token) return;
    const newStatus = !u.isActive;
    if (!confirm(`${newStatus ? 'Mở khóa' : 'Khóa'} tài khoản "${u.email}"?`)) return;
    setBusy(true);
    try {
      await setAdminUserStatus(token, u.id, newStatus);
      toast.success(`Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản.`); void load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Lỗi.'); }
    finally { setBusy(false); }
  };

  return (
    <AdminGuard permission="administrators:view">
    <section>
      <AdminPageHeader title="Quản trị viên" action={
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Thêm tài khoản
        </button>
      } />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm email, họ tên..." className="h-9 rounded-lg border border-slate-200 px-3 text-sm w-56" />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
          <option value="">Tất cả vai trò</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="true">Hoạt động</option>
          <option value="false">Bị khóa</option>
        </select>
        {total > 0 && <span className="ml-auto self-center text-xs text-slate-400">{total} tài khoản</span>}
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
      {!loading && users.length === 0 && <p className="text-sm text-slate-500">Không có tài khoản nào.</p>}
      {!loading && users.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Tài khoản</th>
                <th className="px-4 py-3 text-left">Vai trò</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Ngày tạo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                        : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100"><User className="h-4 w-4 text-slate-400" /></div>}
                      <div>
                        <p className="font-medium text-slate-800">{u.fullName} {u.id === myId && <span className="text-xs text-slate-400">(bạn)</span>}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.adminRole
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          {u.adminRole.isSystem && <Shield className="h-3 w-3 text-primary-500" />}
                          {u.adminRole.name}
                        </span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} disabled={busy} title="Chỉnh sửa" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button>
                      {u.id !== myId && (
                        <button onClick={() => toggleStatus(u)} disabled={busy} title={u.isActive ? 'Khóa' : 'Mở khóa'} className={`rounded p-1.5 ${u.isActive ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-green-50 hover:text-green-600'}`}>
                          {u.isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p)} className={`rounded-md px-3 py-1.5 text-sm ${p === page ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <Modal title={modal === null ? 'Thêm tài khoản quản trị' : 'Chỉnh sửa tài khoản'} onClose={() => setModal(undefined)} busy={busy}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(undefined)} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Hủy</button>
              <button type="submit" form={formId} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          }>
          <form id={formId} onSubmit={save} className="space-y-3">
            {ferror && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{ferror}</p>}
            <label className="block text-sm font-medium">Họ tên *<input required value={fname} onChange={e => setFname(e.target.value)} className={inputCls} /></label>
            <label className="block text-sm font-medium">Email *<input required type="email" value={femail} onChange={e => setFemail(e.target.value)} disabled={modal !== null} className={`${inputCls} ${modal !== null ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`} /></label>
            <label className="block text-sm font-medium">Số điện thoại<input value={fphone} onChange={e => setFphone(e.target.value)} className={inputCls} /></label>
            {modal === null && <label className="block text-sm font-medium">Mật khẩu *<input required type="password" value={fpw} onChange={e => setFpw(e.target.value)} minLength={8} className={inputCls} /></label>}
            <label className="block text-sm font-medium">Vai trò
              <select value={frole} onChange={e => setFrole(e.target.value)} className={inputCls}>
                <option value="">Chưa gán vai trò</option>
                {roles.filter(r => r.isActive).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </form>
        </Modal>
      )}
    </section>
    </AdminGuard>
  );
}
