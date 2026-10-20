'use client';

import { useEffect, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { MessengerGlyph, ZaloGlyph } from './brandIcons';
import SupportContactItem, { type SupportContact } from './SupportContactItem';
import { getPublicStoreInfo } from '@/services/adminSettings.service';

const BASE_CONTACTS: SupportContact[] = [
  {
    id: 'ai',
    label: 'Chatbot AI',
    description: 'Hỏi đáp nhanh 24/7',
    icon: <Bot className="h-5 w-5" />,
    iconBgClassName: 'bg-primary-500',
  },
  {
    id: 'zalo',
    label: 'Zalo',
    description: 'Tư vấn trực tiếp',
    icon: <ZaloGlyph className="h-11 w-11" />,
    iconBgClassName: '',
    iconRoundedClassName: 'rounded-full overflow-hidden',
  },
  {
    id: 'messenger',
    label: 'Messenger',
    description: 'Chat với nhân viên',
    icon: <MessengerGlyph className="h-11 w-11" />,
    iconBgClassName: '',
    iconRoundedClassName: 'rounded-full overflow-hidden',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Nhận hỗ trợ nhanh',
    icon: <Send className="h-4.5 w-4.5" />,
    iconBgClassName: 'bg-[#29A9EB]',
  },
];

export default function FloatingSupportPanel({ onClose }: { onClose: () => void }) {
  const [contacts, setContacts] = useState<SupportContact[]>(BASE_CONTACTS);

  useEffect(() => {
    const ctrl = new AbortController();
    getPublicStoreInfo(ctrl.signal)
      .then(res => {
        const d = res.data ?? {};
        setContacts(
          BASE_CONTACTS.map(c => {
            if (c.id === 'ai') return c;
            const enabled = d[`social.${c.id}.enabled`];
            const url = d[`social.${c.id}.url`]?.trim();
            if (enabled === 'false') return null;
            return url ? { ...c, href: url } : c;
          }).filter(Boolean) as SupportContact[],
        );
      })
      .catch(() => {}); // fallback: keep BASE_CONTACTS as-is
    return () => ctrl.abort();
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Liên hệ hỗ trợ"
      className="w-[min(320px,calc(100vw-2rem))] max-h-[min(480px,calc(100dvh-140px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
    >
      <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-800">Liên hệ hỗ trợ</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">Chúng tôi luôn sẵn sàng 24/7</p>
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

      <div className="space-y-2 p-3">
        {contacts.map(c => <SupportContactItem key={c.id} contact={c} />)}
      </div>
    </div>
  );
}
