import { prisma } from '../config/prisma.js';

// All non-admin accounts are customers: role = 'USER'
const CUSTOMER_WHERE = { role: { not: 'ADMIN' } };

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getCustomerStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [total, newCount, withOrders] = await Promise.all([
    prisma.user.count({ where: CUSTOMER_WHERE }),
    prisma.user.count({ where: { ...CUSTOMER_WHERE, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { ...CUSTOMER_WHERE, orders: { some: {} } } }),
  ]);

  return { total, newCount, withOrders, withoutOrders: total - withOrders };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listCustomers({ page = 1, limit = 20, search, filter = 'all', sortBy = 'newest' } = {}) {
  let where = { ...CUSTOMER_WHERE };

  if (search?.trim()) {
    where = {
      ...where,
      OR: [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ],
    };
  }

  if (filter === 'no_orders') {
    where = { ...where, orders: { none: {} } };
  } else if (filter === 'has_orders') {
    where = { ...where, orders: { some: {} } };
  } else if (filter === 'returning') {
    const rows = await prisma.order.groupBy({
      by: ['userId'],
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
    });
    const ids = rows.map(r => r.userId);
    if (ids.length === 0) return { customers: [], total: 0, page, limit };
    where = { ...where, id: { in: ids } };
  }

  // sortBy = 'spent' requires a post-sort pass
  if (sortBy === 'spent') {
    return listSortedBySpent(where, page, limit);
  }

  const orderBy =
    sortBy === 'oldest'  ? { createdAt: 'asc' } :
    sortBy === 'orders'  ? { orders: { _count: 'desc' } } :
    { createdAt: 'desc' };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, phone: true,
        isActive: true, createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy,
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return enrichWithSpent(users, total, page, limit);
}

async function listSortedBySpent(where, page, limit) {
  const allUsers = await prisma.user.findMany({
    where,
    select: {
      id: true, fullName: true, email: true, phone: true,
      isActive: true, createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  const total = allUsers.length;
  if (total === 0) return { customers: [], total: 0, page, limit };

  const userIds = allUsers.map(u => u.id);
  const [spendAgg, lastOrderRows] = await Promise.all([
    prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: 'DELIVERED' },
      _sum: { subtotal: true },
    }),
    getLastOrderRows(userIds),
  ]);

  const spendMap = Object.fromEntries(spendAgg.map(s => [s.userId, s._sum.subtotal ?? 0]));
  const lastMap = Object.fromEntries(lastOrderRows.map(o => [o.userId, o.createdAt]));

  const sorted = allUsers
    .map(u => ({ ...u, orderCount: u._count.orders, totalSpent: spendMap[u.id] ?? 0, lastOrderAt: lastMap[u.id] ?? null }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice((page - 1) * limit, page * limit)
    .map(({ _count, ...rest }) => rest);

  return { customers: sorted, total, page, limit };
}

async function enrichWithSpent(users, total, page, limit) {
  if (users.length === 0) return { customers: [], total, page, limit };

  const userIds = users.map(u => u.id);
  const [spendAgg, lastOrderRows] = await Promise.all([
    prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: 'DELIVERED' },
      _sum: { subtotal: true },
    }),
    getLastOrderRows(userIds),
  ]);

  const spendMap = Object.fromEntries(spendAgg.map(s => [s.userId, s._sum.subtotal ?? 0]));
  const lastMap = Object.fromEntries(lastOrderRows.map(o => [o.userId, o.createdAt]));

  return {
    customers: users.map(u => ({
      id: u.id, fullName: u.fullName, email: u.email, phone: u.phone,
      isActive: u.isActive, createdAt: u.createdAt,
      orderCount: u._count.orders,
      totalSpent: spendMap[u.id] ?? 0,
      lastOrderAt: lastMap[u.id] ?? null,
    })),
    total, page, limit,
  };
}

async function getLastOrderRows(userIds) {
  if (userIds.length === 0) return [];
  return prisma.order.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
  });
}

// ── Detail ────────────────────────────────────────────────────────────────────

export async function getCustomer(id) {
  const user = await prisma.user.findFirst({
    where: { id, ...CUSTOMER_WHERE },
    select: {
      id: true, fullName: true, email: true, phone: true,
      isActive: true, createdAt: true,
      orders: {
        select: {
          id: true, status: true, paymentMethod: true, subtotal: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
  if (!user) return null;

  const [spendAgg, deliveredCount] = await Promise.all([
    prisma.order.aggregate({
      where: { userId: id, status: 'DELIVERED' },
      _sum: { subtotal: true },
    }),
    prisma.order.count({ where: { userId: id, status: 'DELIVERED' } }),
  ]);

  const lastOrder = user.orders[0] ?? null;

  return {
    ...user,
    totalOrders: user.orders.length,
    deliveredOrders: deliveredCount,
    totalSpent: spendAgg._sum.subtotal ?? 0,
    lastOrderAt: lastOrder?.createdAt ?? null,
  };
}
