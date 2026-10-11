'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { usePermissionStore } from '@/store/permission.store';
import { dashboardMenu } from '@/components/admin/menu.config';

/**
 * Admin root page — smart redirect.
 * - Super Admin or dashboard:view  → /admin/dashboard
 * - No dashboard:view              → first page the user has a permission for
 * - No permissions at all          → /admin/dashboard (route guard shows 403)
 */
export default function AdminRootPage() {
  const router = useRouter();
  const has = usePermissionStore((s) => s.has);
  const isSuperAdmin = usePermissionStore((s) => s.permissions.has('*'));
  const loaded = usePermissionStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) return;

    if (isSuperAdmin || has('dashboard', 'view')) {
      router.replace('/admin/dashboard');
      return;
    }

    // Find the first menu item the user has access to.
    for (const group of dashboardMenu) {
      for (const item of group.children) {
        if (!item.permission) continue;
        const [mod, action] = item.permission.split(':') as [string, string];
        if (has(mod, action)) {
          router.replace(item.path);
          return;
        }
      }
    }

    // Nothing matched — fall through to dashboard; route guard will show 403.
    router.replace('/admin/dashboard');
  }, [loaded, isSuperAdmin, has, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
    </div>
  );
}
