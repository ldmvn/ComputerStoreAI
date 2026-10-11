'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import ProfileSidebar from '@/components/customer/ProfileSidebar';

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8" aria-busy="true" aria-label="Đang tải">
      {/* Sidebar skeleton */}
      <div className="lg:w-60 lg:shrink-0">
        <div className="hidden lg:block">
          <div className="mb-3 flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-slate-100" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-hidden lg:hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 w-16 shrink-0 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
      {/* Content skeleton */}
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !user) router.replace('/login');
  }, [isHydrated, user, router]);

  if (!isHydrated) return <ProfileSkeleton />;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
      <ProfileSidebar user={user} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
