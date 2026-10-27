'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, Heart, Lock, MapPin, Star, User, LogOut, LifeBuoy } from 'lucide-react';
import { mediaUrl } from '@/services/http.client';
import { useAuthStore } from '@/store/auth.store';
import type { AuthUser } from '@/types/user.type';

const navItems = [
  { href: '/customer/profile',           label: 'Thông tin tài khoản', icon: User,             exact: true },
  { href: '/customer/profile/orders',    label: 'Đơn hàng của tôi',    icon: ClipboardList                 },
  { href: '/customer/profile/addresses', label: 'Sổ địa chỉ',          icon: MapPin                        },
  { href: '/customer/profile/reviews',   label: 'Đánh giá của tôi',    icon: Star                          },
  { href: '/customer/wishlist',          label: 'Yêu thích',           icon: Heart                         },
  { href: '/customer/profile/password',  label: 'Bảo mật tài khoản',   icon: Lock                          },
  { href: '/customer/profile/support',   label: 'Yêu cầu hỗ trợ',      icon: LifeBuoy                       },
];

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProfileSidebar({ user }: { user: AuthUser }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { logout } = useAuthStore();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      {/* ── Mobile: horizontal scrollable nav ── */}
      <nav aria-label="Menu tài khoản" className="relative lg:hidden">
        {/* contain:paint — WebKit can otherwise let this row's wide, horizontally-
            scrolled content leak into document.documentElement.scrollWidth even
            though it's already clipped by overflow-x-auto, which on real iOS
            Safari triggers a page-wide shrink-to-fit zoom (shrunk layout, blank
            strip on the right). contain:paint gives WebKit an explicit boundary
            instead of relying on overflow clipping alone. */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [contain:paint]">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex min-h-[2.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs transition-colors ${active ? 'bg-primary-50 font-medium text-primary-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex min-h-[2.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-red-600"
          >
            <LogOut size={20} aria-hidden="true" />
            <span className="whitespace-nowrap">Đăng xuất</span>
          </button>
        </div>
        {/* right-edge fade — signals horizontal scroll */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50 to-transparent" aria-hidden="true" />
      </nav>

      {/* ── Desktop: vertical sidebar ── */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="mb-3 flex items-center gap-3 border-b border-slate-200 pb-4">
          {user.avatarUrl
            ? <Image src={mediaUrl(user.avatarUrl)} alt={user.fullName} width={48} height={48} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary-100" />
            : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">{getInitials(user.fullName)}</div>}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{user.fullName}</p>
            <p className="text-sm text-slate-400">{user.phone || 'Chưa có SĐT'}</p>
          </div>
        </div>
        <nav aria-label="Menu tài khoản">
          <ul className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-primary-50 font-medium text-primary-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                  >
                    <Icon size={17} className={active ? 'text-primary-500' : 'text-slate-400'} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} className="text-slate-400" aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
