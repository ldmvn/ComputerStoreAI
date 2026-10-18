'use client';

import { Bot, Send } from 'lucide-react';
import { MessengerGlyph, ZaloGlyph } from './brandIcons';

const QUICK_ICONS = [
  { id: 'ai', label: 'Chatbot AI', icon: <Bot className="h-5 w-5" />, className: 'bg-primary-500', hasNotification: true, rounded: 'rounded-full' },
  { id: 'zalo', label: 'Chat Zalo', icon: <ZaloGlyph className="h-11 w-11" />, className: '', rounded: 'rounded-full overflow-hidden' },
  { id: 'messenger', label: 'Chat Messenger', icon: <MessengerGlyph className="h-12 w-12" />, className: '', hasNotification: true, rounded: 'rounded-full overflow-hidden' },
  { id: 'telegram', label: 'Chat Telegram', icon: <Send className="h-4.5 w-4.5" />, className: 'bg-[#29A9EB]', rounded: 'rounded-full' },
];

export default function FloatingSupportToggle({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-l-2xl bg-white p-2 shadow-lg shadow-slate-900/15 ring-1 ring-slate-200">
      {QUICK_ICONS.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          title={item.label}
          aria-label={item.label}
          // Chỉ Chatbot AI hiện trên mobile cho gọn — bấm vào sẽ mở panel đầy đủ.
          className={`group relative transition-transform duration-200 ease-out hover:-translate-x-1.5 hover:scale-110 ${i > 0 ? 'hidden sm:block' : ''}`}
        >
          <span className={`flex h-12 w-12 items-center justify-center text-white shadow-sm transition-shadow duration-200 group-hover:shadow-lg group-hover:shadow-slate-900/25 ${item.rounded} ${item.className}`}>
            {item.icon}
          </span>
          {item.hasNotification && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  );
}
