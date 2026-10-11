import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

const ADMIN_ROLES = ['ADMIN'];

function adminUserSelect(includeRole = true) {
  return {
    id: true, fullName: true, email: true, phone: true, avatarUrl: true,
    role: true, adminRoleId: true, isActive: true,
    lastLoginAt: true, createdAt: true, updatedAt: true,
    ...(includeRole ? {
      adminRole: { select: { id: true, name: true, slug: true, isSystem: true, isActive: true } },
    } : {}),
  };
}

export async function listAdminUsers({ page = 1, limit = 20, search, roleId, isActive }) {
  const where = { role: { in: ADMIN_ROLES } };
  if (search) where.OR = [{ fullName: { contains: search } }, { email: { contains: search } }];
  if (roleId != null) where.adminRoleId = Number(roleId);
  if (isActive != null) where.isActive = isActive === 'true' || isActive === true;
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      select: adminUserSelect(),
    }),
  ]);
  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAdminUser(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: adminUserSelect() });
  if (!user || !ADMIN_ROLES.includes(user.role)) throw Object.assign(new Error('Tài khoản không tồn tại.'), { status: 404 });
  return user;
}

export async function createAdminUser({ fullName, email, phone, password, adminRoleId }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error('Email đã được sử dụng.'), { status: 409 });
  if (adminRoleId) {
    const role = await prisma.role.findUnique({ where: { id: adminRoleId } });
    if (!role || !role.isActive) throw Object.assign(new Error('Vai trò không hợp lệ hoặc đã bị vô hiệu hóa.'), { status: 422 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { fullName, email, phone: phone || null, passwordHash, role: 'ADMIN', adminRoleId: adminRoleId || null },
    select: adminUserSelect(),
  });
}

export async function updateAdminUser(id, { fullName, phone, adminRoleId }) {
  await getAdminUser(id); // validates exists + is admin
  if (adminRoleId != null) {
    const role = await prisma.role.findUnique({ where: { id: adminRoleId } });
    if (!role || !role.isActive) throw Object.assign(new Error('Vai trò không hợp lệ hoặc đã bị vô hiệu hóa.'), { status: 422 });
  }
  return prisma.user.update({
    where: { id },
    data: { fullName, phone: phone || null, adminRoleId: adminRoleId ?? undefined },
    select: adminUserSelect(),
  });
}

export async function setAdminUserStatus(id, isActive, requesterId) {
  const user = await getAdminUser(id);
  if (id === requesterId) throw Object.assign(new Error('Không thể khóa tài khoản của chính mình.'), { status: 400 });
  if (!isActive) {
    // Guard: cannot disable the last active admin
    const activeCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (activeCount <= 1) throw Object.assign(new Error('Không thể vô hiệu hóa quản trị viên cuối cùng đang hoạt động.'), { status: 400 });
  }
  return prisma.user.update({ where: { id }, data: { isActive }, select: adminUserSelect() });
}
