'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/admin/DashboardShell';
import LoginModal from '@/components/layout/LoginModal';
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
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isHydrated) void hydrate();
  }, [hydrate, isHydrated]);

  useEffect(() => {
    if (isHydrated && isAdmin && !permissionsLoaded) {
      void loadPermissions(token);
    }
  }, [isHydrated, isAdmin, token, permissionsLoaded, loadPermissions]);

  if (!isHydrated) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoginModal isOpen onClose={() => router.replace('/')} />
      </div>
    );
  }

  if (!permissionsLoaded) return null;

  return <DashboardShell>{children}</DashboardShell>;
}
