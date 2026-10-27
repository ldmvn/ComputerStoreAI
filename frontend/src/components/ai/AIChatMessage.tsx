'use client';

import { AlertCircle } from 'lucide-react';
import MascotAvatar from '@/components/layout/support-widget/MascotAvatar';
import type { ChatMessage } from '@/types/ai.type';

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5" aria-label="Đang trả lời">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

export default function AIChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary-600 px-3.5 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-primary-200">
        <MascotAvatar />
      </span>
      <div
        className={`max-w-[80%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm ${
          message.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
        }`}
      >
        {message.status === 'error' && (
          <span className="mb-1 flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Lỗi
          </span>
        )}
        {message.status === 'sending' ? <TypingDots /> : message.content}
      </div>
    </div>
  );
}
