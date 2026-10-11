'use client';

import { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import AdminRouteGuard from './AdminRouteGuard';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <DashboardTopbar
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        onOpenMobileSidebar={() => setMobileOpen(true)}
      />
      <div className="flex min-h-[calc(100vh-var(--header-main-height))]">
        <DashboardSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onExpandSidebar={() => setCollapsed(false)}
        />
        <main className="min-w-0 w-full flex-1 px-4 py-6 sm:px-5 sm:py-7 md:px-6 lg:px-8 lg:py-8 2xl:px-10">
          <div className="w-full min-w-0">
            <AdminRouteGuard>{children}</AdminRouteGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
