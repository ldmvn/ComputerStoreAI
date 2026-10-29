'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut, ShoppingBag, User } from 'lucide-react';
import type { AuthUser } from '@/types/user.type';
import { useAuthStore } from '@/store/auth.store';
import { mediaUrl } from '@/services/http.client';

function UserAvatar({ user }: { user: AuthUser }) {
  const [imgError, setImgError] = useState(false);
  const src = user.avatarUrl && !imgError ? mediaUrl(user.avatarUrl) : null;
  const initial = user.fullName.trim().charAt(0).toUpperCase() || '?';

  if (src) {
    return (
      <Image
        src={src}
        alt={user.fullName}
        width={32}
        height={32}
        onError={() => setImgError(true)}
        className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-white md:h-[30px] md:w-[30px] xl:h-8 xl:w-8"
      />
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 ring-2 ring-white md:h-[30px] md:w-[30px] xl:h-8 xl:w-8">
      {initial}
    </span>
  );
}

export default function AccountDropdown({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const itemClass = 'ui-menu-item flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 focus-visible:-outline-offset-2';

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Tài khoản: ${user.fullName}`}
        aria-expanded={open}
        aria-controls={panelId}
        className="header-action md:h-auto md:w-auto md:px-2 md:py-2"
      >
        <UserAvatar user={user} />
        <span className="hidden flex-col items-start leading-none md:flex">
          <span className="text-[10px] font-normal text-slate-400">Xin chào</span>
          <span className="max-w-[7rem] truncate text-sm font-semibold">{user.fullName}</span>
        </span>
        <ChevronDown aria-hidden="true" className={`hidden h-4 w-4 transition-transform motion-reduce:transition-none md:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 top-full z-50 mt-2 w-[260px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-lg shadow-slate-900/10">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <UserAvatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <nav aria-label="Menu tài khoản" className="divide-y divide-slate-100">
            <Link href="/customer/profile" onClick={() => setOpen(false)} className={itemClass}>
              <User className="h-4 w-4" aria-hidden="true" /> Tài khoản của tôi
            </Link>
            <Link href="/customer/profile/orders" onClick={() => setOpen(false)} className={itemClass}>
              <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Đơn hàng của tôi
            </Link>
            <button type="button" onClick={async () => { setOpen(false); await logout(); router.push('/'); }} className={`${itemClass} hover:text-red-600`}>
              <LogOut className="h-4 w-4" aria-hidden="true" /> Đăng xuất
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
