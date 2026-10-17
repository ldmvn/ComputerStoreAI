'use client';

import Link from 'next/link';
import { ChevronDown, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePermissionStore } from '@/store/permission.store';
import { dashboardMenu, dashboardOverview, type DashboardMenuGroup } from './menu.config';

type DashboardSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onExpandSidebar: () => void;
};

function isPathActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function groupHasActiveChild(pathname: string, group: DashboardMenuGroup) {
  return group.children.some((item) => isPathActive(pathname, item.path));
}

export default function DashboardSidebar({ collapsed, mobileOpen, onCloseMobile, onExpandSidebar }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const canSee = usePermissionStore((s) => s.has);

  // Filter menu groups — hide items the user has no permission for, hide empty groups.
  const visibleMenu = dashboardMenu
    .map(group => ({
      ...group,
      children: group.children.filter(item => {
        if (!item.permission) return true;
        const [mod, action] = item.permission.split(':') as [string, string];
        return canSee(mod, action);
      }),
    }))
    .filter(group => group.children.length > 0);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      visibleMenu.forEach((group) => {
        if (groupHasActiveChild(pathname, group)) next[group.label] = true;
      });
      return next;
    });
  }, [pathname]);

  // Group children are hidden while the rail is collapsed, so toggling there would open a
  // submenu nobody can see. Expand the rail instead and reveal the group.
  const toggleGroup = (label: string) => {
    if (collapsed) {
      onExpandSidebar();
      setOpenGroups((current) => ({ ...current, [label]: true }));
      return;
    }
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  const handleNavigation = () => {
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-[var(--header-main-height)] z-40 bg-slate-900/30 lg:hidden"
          onClick={onCloseMobile}
          aria-label="Đóng menu dashboard"
        />
      )}
      <aside
        className={`fixed bottom-0 left-0 top-[var(--header-main-height)] z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-[calc(100vh-var(--header-main-height))] lg:translate-x-0 lg:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
        aria-label="Menu dashboard"
      >
        <div className="flex shrink-0 items-center justify-end border-b border-slate-200 px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={onCloseMobile}
            className="ui-button inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Đóng menu dashboard"
            title="Đóng menu dashboard"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Điều hướng quản trị">
          {canSee('dashboard', 'view') && (
            <Link
              href={dashboardOverview.path}
              onClick={handleNavigation}
              aria-current={pathname === dashboardOverview.path ? 'page' : undefined}
              className={`ui-menu-item group mb-2 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                isPathActive(pathname, dashboardOverview.path) && pathname === dashboardOverview.path
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
              title={collapsed ? dashboardOverview.label : undefined}
            >
              <dashboardOverview.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={collapsed ? 'lg:hidden' : ''}>{dashboardOverview.label}</span>
            </Link>
          )}

          <div className="space-y-1">
            {visibleMenu.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = Boolean(openGroups[group.label]);
              const hasActiveChild = groupHasActiveChild(pathname, group);

              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    data-active={hasActiveChild || undefined}
                    className={`ui-menu-item group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                      hasActiveChild ? 'text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                    aria-expanded={isOpen}
                    title={collapsed ? group.label : undefined}
                  >
                    <GroupIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className={collapsed ? 'lg:hidden' : ''}>{group.label}</span>
                    <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${collapsed ? 'lg:hidden' : ''}`} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div className={`ml-3 border-l border-slate-200 pl-3 ${collapsed ? 'lg:hidden' : ''}`}>
                      {group.children.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isPathActive(pathname, item.path);
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            onClick={handleNavigation}
                            aria-current={active ? 'page' : undefined}
                            className={`ui-menu-item flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                              active
                                ? 'border-l-2 border-primary-600 bg-primary-50 font-semibold text-primary-700'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
