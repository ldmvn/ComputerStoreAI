'use client';

import MascotAvatar from '@/components/layout/support-widget/MascotAvatar';

export default function AIChatWelcome() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-primary-200">
          <MascotAvatar />
        </span>
        <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700">
          <p>Xin chào! 👋</p>
          <p>Mình có thể giúp gì cho bạn?</p>
        </div>
      </div>
    </div>
  );
}
