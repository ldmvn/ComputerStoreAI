'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useMaintenanceStore } from '@/store/maintenance.store';

function BouncingDots() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-3.5 w-3.5 rounded-full bg-primary-500"
          style={{
            animation: 'bounce-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-18px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function MaintenanceOverlay() {
  const active = useMaintenanceStore(s => s.active);
  const message = useMaintenanceStore(s => s.message);
  const activate = useMaintenanceStore(s => s.activate);
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      activate(msg);
    };
    window.addEventListener('app:maintenance', handler);
    return () => window.removeEventListener('app:maintenance', handler);
  }, [activate]);

  const bypass = pathname.startsWith('/admin') || pathname.startsWith('/auth');
  if (!active || bypass) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50">
      <div className="mx-4 w-full max-w-md text-center">
        <div className="mb-8">
          <BouncingDots />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-slate-800">Đang bảo trì</h1>
        <p className="text-sm leading-relaxed text-slate-500">{message}</p>
      </div>
    </div>
  );
}
