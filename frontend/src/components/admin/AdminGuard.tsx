'use client';

import { ShieldOff } from 'lucide-react';
import { usePermissionStore } from '@/store/permission.store';

type Props = {
  /**
   * Permission key required, e.g. 'products:view' or ['products:view', 'products:create'].
   * Pass null to allow any authenticated admin.
   */
  permission: string | string[] | null;
  children: React.ReactNode;
};

const Denied = () => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <ShieldOff className="mb-4 h-12 w-12 text-slate-300" />
    <h2 className="mb-1 text-lg font-semibold text-slate-700">Không có quyền truy cập</h2>
    <p className="text-sm text-slate-500">Bạn không có quyền xem trang này. Liên hệ quản trị viên cấp cao để được cấp quyền.</p>
  </div>
);

/**
 * Renders children only when the current user holds the required permission.
 * Shows a 403 message otherwise — backend is the real enforcement layer.
 */
export default function AdminGuard({ permission, children }: Props) {
  const has = usePermissionStore((s) => s.has);
  const hasAny = usePermissionStore((s) => s.hasAny);

  if (permission === null) {
    // No permission mapping — any authenticated admin may access.
    return <>{children}</>;
  }

  const keys = Array.isArray(permission) ? permission : [permission];
  const allowed = keys.length === 1
    ? has(...(keys[0].split(':') as [string, string]))
    : hasAny(keys);

  return allowed ? <>{children}</> : <Denied />;
}
