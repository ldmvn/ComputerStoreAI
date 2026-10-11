'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/admin/DashboardShell';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionStore } from '@/store/permission.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const loadPermissions = usePermissionStore((state) => state.load);
  const permissionsLoaded = usePermissionStore((state) => state.loaded);
  const isAdmin = Boolean(token) && user?.role === 'ADMIN';

  useEffect(() => {
    if (!isHydrated) void hydrate();
  }, [hydrate, isHydrated]);

  // Load RBAC permissions once after auth is ready.
  useEffect(() => {
    if (isHydrated && isAdmin && token && !permissionsLoaded) {
      void loadPermissions(token);
    }
  }, [isHydrated, isAdmin, token, permissionsLoaded, loadPermissions]);

  useEffect(() => {
    if (isHydrated && !isAdmin) router.replace('/');
  }, [isHydrated, isAdmin, router]);

  if (!isHydrated || !isAdmin || !permissionsLoaded) {
    return (
      <p role="status" className="px-4 py-12 text-center text-slate-600">
        Đang kiểm tra quyền truy cập…
      </p>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
