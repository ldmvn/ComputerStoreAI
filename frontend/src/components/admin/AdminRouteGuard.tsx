'use client';

import { usePathname } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { usePermissionStore } from '@/store/permission.store';

// Centralized route → permission map. Longest prefix wins.
// 'ALL_ADMINS' = any authenticated admin (no specific permission needed).
// 'module:action' = specific RBAC permission required.
// Route not in map → SUPER_ADMIN_ONLY (default deny for restricted accounts).
const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: string | 'ALL_ADMINS' }> = [
  { prefix: '/admin/dashboard',        permission: 'dashboard:view' },
  { prefix: '/admin/products',         permission: 'products:view' },
  { prefix: '/admin/categories',       permission: 'categories:view' },
  { prefix: '/admin/brands',           permission: 'brands:view' },
  { prefix: '/admin/attributes',       permission: 'attributes:view' },
  { prefix: '/admin/mega-menu',        permission: 'megamenu:view' },
  { prefix: '/admin/inventory',        permission: 'inventory:view' },
  { prefix: '/admin/banners',          permission: 'banners:view' },
  { prefix: '/admin/product-sections', permission: 'product_sections:view' },
  { prefix: '/admin/promotions',       permission: 'promotions:view' },
  { prefix: '/admin/reviews',          permission: 'reviews:view' },
  { prefix: '/admin/orders',           permission: 'orders:view' },
  { prefix: '/admin/customers',        permission: 'customers:view' },
  { prefix: '/admin/payments',         permission: 'orders:view' },
  { prefix: '/admin/shipping',         permission: 'orders:manage' },
  { prefix: '/admin/returns',          permission: 'returns:view' },
  { prefix: '/admin/reports',          permission: 'reports:view' },
  { prefix: '/admin/build-pc',         permission: 'build_pc:view' },
  { prefix: '/admin/roles',              permission: 'roles:view' },
  { prefix: '/admin/admin-users',        permission: 'administrators:view' },
  { prefix: '/admin/activity-logs',      permission: 'activity_logs:view' },
  { prefix: '/admin/settings',           permission: 'settings:view' },
];

function getRequiredPermission(pathname: string): string | 'ALL_ADMINS' | 'SUPER_ADMIN_ONLY' {
  let best: (typeof ROUTE_PERMISSIONS[0]) | undefined;
  for (const entry of ROUTE_PERMISSIONS) {
    const exact = pathname === entry.prefix;
    const child = pathname.startsWith(entry.prefix + '/');
    if ((exact || child) && (!best || entry.prefix.length > best.prefix.length)) {
      best = entry;
    }
  }
  return best?.permission ?? 'SUPER_ADMIN_ONLY';
}

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const has = usePermissionStore((s) => s.has);
  const isSuperAdmin = usePermissionStore((s) => s.permissions.has('*'));

  const required = getRequiredPermission(pathname);

  let allowed: boolean;
  if (required === 'ALL_ADMINS') {
    allowed = true;
  } else if (required === 'SUPER_ADMIN_ONLY') {
    allowed = isSuperAdmin;
  } else {
    const [mod, action] = required.split(':') as [string, string];
    allowed = has(mod, action);
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <ShieldOff className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-800">403</h1>
        <p className="mb-1 text-base font-semibold text-slate-700">Không có quyền truy cập</p>
        <p className="max-w-sm text-sm text-slate-500">
          Tài khoản của bạn chưa được cấp quyền xem trang này.
          Liên hệ quản trị viên cấp cao để được phân quyền.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
