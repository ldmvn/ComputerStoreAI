'use client';

import { ArrowLeft, RotateCcw, X } from 'lucide-react';
import MascotAvatar from '@/components/layout/support-widget/MascotAvatar';

export default function AIChatHeader({ onBack, onClose, onReset }: { onBack: () => void; onClose: () => void; onReset: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-t-2xl bg-primary-600 px-4 py-3.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại Liên hệ hỗ trợ"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
      </button>

      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/70">
        <MascotAvatar />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">Chatbot AI</p>
        <p className="truncate text-xs text-white/80">Trợ lý DUCMANH PC</p>
      </div>

      <button type="button" onClick={onReset} aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15">
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
      >
        <X className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
