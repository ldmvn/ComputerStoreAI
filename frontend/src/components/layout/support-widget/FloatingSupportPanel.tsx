'use client';

import { Bot, Clock, Send, X } from 'lucide-react';
import { MessengerGlyph, ZaloGlyph } from './brandIcons';
import SupportContactItem, { type SupportContact } from './SupportContactItem';

const CONTACTS: SupportContact[] = [
  {
    id: 'ai',
    label: 'Chatbot AI',
    description: 'Tư vấn cấu hình, chọn linh kiện phù hợp với nhu cầu của bạn',
    icon: <Bot className="h-5 w-5" />,
    iconBgClassName: 'bg-primary-500',
    hasNotification: true,
    highlighted: true,
  },
  {
    id: 'zalo',
    label: 'Chat Zalo',
    description: 'Nhanh chóng, tiện lợi',
    icon: <ZaloGlyph className="h-11 w-11" />,
    iconBgClassName: '',
    iconRoundedClassName: 'rounded-full overflow-hidden',
  },
  {
    id: 'messenger',
    label: 'Chat Messenger',
    description: 'Tư vấn và hỗ trợ trực tiếp',
    icon: <MessengerGlyph className="h-11 w-11" />,
    iconBgClassName: '',
    iconRoundedClassName: 'rounded-full overflow-hidden',
    hasNotification: true,
  },
  {
    id: 'telegram',
    label: 'Chat Telegram',
    description: 'Nhận tư vấn nhanh qua Telegram',
    icon: <Send className="h-4.5 w-4.5" />,
    iconBgClassName: 'bg-[#29A9EB]',
  },
];

export default function FloatingSupportPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Liên hệ hỗ trợ"
      className="w-[min(340px,calc(100vw-1rem))] overflow-hidden rounded-l-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">Hỗ trợ DUCMANH PC</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">Tư vấn và hỗ trợ nhanh chóng</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="space-y-1 px-2 pb-2">
        {CONTACTS.map(c => <SupportContactItem key={c.id} contact={c} />)}
      </div>

      <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2.5">
        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <p className="text-xs text-slate-500">Thời gian hỗ trợ: 8h - 24h (hàng ngày)</p>
      </div>
    </div>
  );
}
