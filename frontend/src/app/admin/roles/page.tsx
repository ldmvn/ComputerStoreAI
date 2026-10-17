'use client';
import AdminGuard from '@/components/admin/AdminGuard';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, KeyRound, Plus, Shield, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/auth.store';
import {
  type Permission, type Role,
  createRole, deleteRole, getPermissions, getRoles, setRolePermissions, updateRole,
} from '@/services/rbac.service';

function slugify(v: string) { return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

const inputCls = 'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none';
const MODULE_LABELS: Record<string, string> = {
  products: 'Sản phẩm', categories: 'Danh mục', brands: 'Thương hiệu', attributes: 'Thuộc tính',
  megamenu: 'Mega Menu', inventory: 'Kho', banners: 'Banner', product_sections: 'Khối sản phẩm',
  promotions: 'Khuyến mãi', reviews: 'Đánh giá', orders: 'Đơn hàng', customers: 'Khách hàng',
  returns: 'Đổi trả', reports: 'Báo cáo', build_pc: 'Build PC',
  administrators: 'Quản trị viên', roles: 'Vai trò', activity_logs: 'Nhật ký',
};

export default function RolesPage() {
  const token = useAuthStore(s => s.token);
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Modal state: undefined=closed, null=create, number=edit id
  const [roleModal, setRoleModal] = useState<undefined | null | number>(undefined);
  const [permModal, setPermModal] = useState<number | undefined>(undefined); // role id

  // Role form
  const [fname, setFname] = useState('');
  const [fslug, setFslug] = useState('');
  const [fdesc, setFdesc] = useState('');
  const [fsort, setFsort] = useState('0');
  const [fslugTouched, setFslugTouched] = useState(false);
  const [ferror, setFerror] = useState('');

  // Permission editor
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set());
  const [permBusy, setPermBusy] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([getRoles(token), getPermissions(token)]);
      setRoles(r.roles); setPermissions(p.permissions);
    } catch { toast.error('Không tải được dữ liệu.'); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!fslugTouched) setFslug(slugify(fname)); }, [fname, fslugTouched]);

  const openCreate = () => { setFname(''); setFslug(''); setFdesc(''); setFsort('0'); setFslugTouched(false); setFerror(''); setRoleModal(null); };
  const openEdit = (r: Role) => { setFname(r.name); setFslug(r.slug); setFdesc(r.description || ''); setFsort(String(r.sortOrder)); setFslugTouched(true); setFerror(''); setRoleModal(r.id); };

  const saveRole = async () => {
    if (!fname.trim()) { setFerror('Tên vai trò là bắt buộc.'); return; }
    setBusy(true); setFerror('');
    try {
      if (roleModal === null) {
        await createRole(token, { name: fname.trim(), slug: fslug.trim(), description: fdesc.trim() || undefined, sortOrder: Number(fsort) });
        toast.success('Đã tạo vai trò.');
      } else {
        await updateRole(token, roleModal as number, { name: fname.trim(), slug: fslug.trim(), description: fdesc.trim() || undefined, sortOrder: Number(fsort) });
        toast.success('Đã cập nhật vai trò.');
      }
      setRoleModal(undefined); await load();
    } catch (e) { setFerror(e instanceof Error ? e.message : 'Lỗi.'); }
    finally { setBusy(false); }
  };

  const removeRole = async (r: Role) => {
    if (!confirm(`Xóa vai trò "${r.name}"?`)) return;
    setBusy(true);
    try { await deleteRole(token, r.id); toast.success('Đã xóa vai trò.'); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Lỗi.'); }
    finally { setBusy(false); }
  };

  const openPermModal = (r: Role) => {
    setPermModal(r.id);
    setSelectedPerms(new Set(r.permissions.map(rp => rp.permissionId)));
    setExpandedModules(new Set(permissions.map(p => p.module)));
  };

  const savePermissions = async () => {
    if (permModal == null) return;
    setPermBusy(true);
    try {
      await setRolePermissions(token, permModal, [...selectedPerms]);
      toast.success('Đã cập nhật quyền.'); setPermModal(undefined); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Lỗi.'); }
    finally { setPermBusy(false); }
  };

  const permsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p); return acc;
  }, {});
  const editRole = permModal != null ? roles.find(r => r.id === permModal) : undefined;

  const toggleModule = (mod: string, all: Permission[]) => {
    const ids = all.map(p => p.id);
    const allChecked = ids.every(id => selectedPerms.has(id));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      ids.forEach(id => allChecked ? next.delete(id) : next.add(id));
      return next;
    });
  };

  return (
    <AdminGuard permission="roles:view">
    <section>
      <AdminPageHeader title="Phân quyền" action={
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />Tạo vai trò
        </button>
      } />

      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
      {!loading && roles.length === 0 && <p className="text-sm text-slate-500">Chưa có vai trò nào.</p>}
      {!loading && roles.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Vai trò</th>
                <th className="px-4 py-3 text-left">Mô tả</th>
                <th className="px-4 py-3 text-center">Quyền</th>
                <th className="px-4 py-3 text-center">Tài khoản</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.isSystem && <Shield className="h-3.5 w-3.5 shrink-0 text-primary-500" aria-label="Vai trò hệ thống" />}
                      <div>
                        <p className="font-medium text-slate-800">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.description || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openPermModal(r)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-primary-300 hover:text-primary-700">
                      <KeyRound className="h-3 w-3" />{r.permissions.length}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{r._count?.adminUsers ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.isActive ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} disabled={busy} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button>
                      {!r.isSystem && <button onClick={() => removeRole(r)} disabled={busy} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Create/Edit Modal */}
      {roleModal !== undefined && (
        <Modal
          title={roleModal === null ? 'Tạo vai trò mới' : 'Chỉnh sửa vai trò'}
          onClose={() => setRoleModal(undefined)} busy={busy}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRoleModal(undefined)} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Hủy</button>
              <button type="button" onClick={saveRole} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          }>
          <div className="space-y-3">
            {ferror && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{ferror}</p>}
            <label className="block text-sm font-medium">Tên vai trò *<input value={fname} onChange={e => setFname(e.target.value)} className={inputCls} /></label>
            <label className="block text-sm font-medium">Slug<input value={fslug} onChange={e => { setFslugTouched(true); setFslug(e.target.value); }} className={inputCls} /></label>
            <label className="block text-sm font-medium">Mô tả<textarea value={fdesc} onChange={e => setFdesc(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></label>
            <label className="block text-sm font-medium">Thứ tự sắp xếp<input type="number" value={fsort} onChange={e => setFsort(e.target.value)} className={inputCls} /></label>
          </div>
        </Modal>
      )}

      {/* Permission Matrix Modal */}
      {permModal != null && editRole && (
        <Modal title={`Phân quyền — ${editRole.name}`} onClose={() => setPermModal(undefined)} busy={permBusy} size="lg"
          footer={
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">{selectedPerms.size} / {permissions.length} quyền được chọn</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPermModal(undefined)} disabled={permBusy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Hủy</button>
                {!editRole.isSystem && <button type="button" onClick={savePermissions} disabled={permBusy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{permBusy ? 'Đang lưu...' : 'Lưu quyền'}</button>}
              </div>
            </div>
          }>
          {editRole.isSystem && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Vai trò hệ thống — quyền chỉ đọc.</p>}
          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(permsByModule).map(([mod, perms]) => {
              const modLabel = MODULE_LABELS[mod] || mod;
              const allChecked = perms.every(p => selectedPerms.has(p.id));
              const someChecked = perms.some(p => selectedPerms.has(p.id));
              const expanded = expandedModules.has(mod);
              return (
                <div key={mod} className="rounded-lg border border-slate-100 overflow-hidden">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
                    <button type="button" onClick={() => setExpandedModules(prev => { const n = new Set(prev); expanded ? n.delete(mod) : n.add(mod); return n; })} className="text-slate-400 hover:text-slate-600">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }} onChange={() => !editRole.isSystem && toggleModule(mod, perms)} disabled={editRole.isSystem} className="h-4 w-4 accent-primary-600" />
                    <span className="text-sm font-semibold text-slate-700">{modLabel}</span>
                    <span className="ml-auto text-xs text-slate-400">{perms.filter(p => selectedPerms.has(p.id)).length}/{perms.length}</span>
                  </div>
                  {expanded && (
                    <div className="grid grid-cols-1 gap-0 divide-y divide-slate-50 sm:grid-cols-2">
                      {perms.map(p => (
                        <label key={p.id} className="flex items-start gap-2.5 px-4 py-2 hover:bg-slate-50">
                          <input type="checkbox" checked={selectedPerms.has(p.id)} onChange={e => { if (editRole.isSystem) return; setSelectedPerms(prev => { const n = new Set(prev); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; }); }} disabled={editRole.isSystem} className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{p.label}</p>
                            {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </section>
    </AdminGuard>
  );
}
