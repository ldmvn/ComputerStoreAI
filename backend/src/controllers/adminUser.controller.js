import * as svc from '../services/adminUser.service.js';
import { logActivity } from '../services/activityLog.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message || 'Lỗi máy chủ.' });

export async function listAdminUsers(req, res) {
  try {
    const { page = 1, limit = 20, search, roleId, isActive } = req.query;
    ok(res, await svc.listAdminUsers({ page: Number(page), limit: Math.min(Number(limit), 100), search, roleId, isActive }));
  } catch (e) { err(res, e); }
}

export async function getAdminUser(req, res) {
  try { ok(res, { user: await svc.getAdminUser(Number(req.params.id)) }); } catch (e) { err(res, e); }
}

export async function createAdminUser(req, res) {
  try {
    const { fullName, email, phone, password, adminRoleId } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password) return res.status(422).json({ success: false, message: 'fullName, email và password là bắt buộc.' });
    if (password.length < 8) return res.status(422).json({ success: false, message: 'Mật khẩu phải ít nhất 8 ký tự.' });
    const user = await svc.createAdminUser({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phone, password, adminRoleId: adminRoleId ? Number(adminRoleId) : null });
    await logActivity({ req, action: 'create', module: 'administrators', targetId: user.id, targetLabel: user.email, description: `Tạo tài khoản quản trị "${user.email}"` });
    ok(res, { user }, 201);
  } catch (e) { err(res, e); }
}

export async function updateAdminUser(req, res) {
  try {
    const id = Number(req.params.id);
    const { fullName, phone, adminRoleId } = req.body;
    const user = await svc.updateAdminUser(id, { fullName: fullName?.trim(), phone, adminRoleId: adminRoleId != null ? Number(adminRoleId) : undefined });
    await logActivity({ req, action: 'update', module: 'administrators', targetId: id, targetLabel: user.email, description: `Cập nhật tài khoản "${user.email}"` });
    ok(res, { user });
  } catch (e) { err(res, e); }
}

export async function setAdminUserStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(422).json({ success: false, message: 'isActive phải là boolean.' });
    const user = await svc.setAdminUserStatus(id, isActive, req.user.userId);
    await logActivity({ req, action: isActive ? 'unlock' : 'lock', module: 'administrators', targetId: id, targetLabel: user.email, description: `${isActive ? 'Mở khóa' : 'Khóa'} tài khoản "${user.email}"` });
    ok(res, { user });
  } catch (e) { err(res, e); }
}
