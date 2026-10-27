'use client';

import { useMemo } from 'react';
import { Send, X } from 'lucide-react';
import { MessengerGlyph, ZaloGlyph } from './brandIcons';
import MascotAvatar from './MascotAvatar';
import SupportContactItem, { type SupportContact } from './SupportContactItem';
import { resolveWidgetConfig, type ResolvedWidgetConfig, type WidgetChannelId } from '@/lib/supportWidget';

// Chuyển cấu hình đã resolve (tên/mô tả/logo/thứ tự/bật-tắt từ Store Settings)
// thành danh sách SupportContact để render. Dùng chung cho Storefront và Live
// Preview trong Dashboard nên tách thành hàm thuần, không gọi API ở đây.
export function buildSupportContacts(config: ResolvedWidgetConfig): SupportContact[] {
  return config.order
    .map(id => config.channels[id])
    .filter(c => c.enabled)
    .map(c => contactFromChannel(c.id, c));
}

function ChannelLogo({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-11 w-11 object-cover" />;
}

function contactFromChannel(id: WidgetChannelId, c: ResolvedWidgetConfig['channels'][WidgetChannelId]): SupportContact {
  if (id === 'ai') {
    return {
      id,
      label: c.name,
      description: c.description,
      icon: <MascotAvatar src={c.logoUrl} />,
      iconBgClassName: 'bg-primary-50',
      iconRoundedClassName: 'rounded-full overflow-hidden ring-1 ring-primary-200',
      highlighted: true,
    };
  }
  if (id === 'zalo') {
    return {
      id,
      label: c.name,
      description: c.description,
      icon: c.logoUrl ? <ChannelLogo src={c.logoUrl} /> : <ZaloGlyph className="h-11 w-11" />,
      iconBgClassName: '',
      iconRoundedClassName: 'rounded-full overflow-hidden',
      href: c.href,
    };
  }
  if (id === 'messenger') {
    return {
      id,
      label: c.name,
      description: c.description,
      icon: c.logoUrl ? <ChannelLogo src={c.logoUrl} /> : <MessengerGlyph className="h-11 w-11" />,
      iconBgClassName: '',
      iconRoundedClassName: 'rounded-full overflow-hidden',
      href: c.href,
    };
  }
  // telegram
  return {
    id,
    label: c.name,
    description: c.description,
    icon: c.logoUrl ? <ChannelLogo src={c.logoUrl} /> : <Send className="h-4.5 w-4.5" />,
    iconBgClassName: c.logoUrl ? '' : 'bg-[#29A9EB]',
    iconRoundedClassName: c.logoUrl ? 'rounded-full overflow-hidden' : undefined,
    href: c.href,
  };
}

const FALLBACK_CONFIG = resolveWidgetConfig({});

export default function FloatingSupportPanel({ config, onClose, onOpenChat }: { config: ResolvedWidgetConfig | null; onClose: () => void; onOpenChat: () => void }) {
  const effective = config ?? FALLBACK_CONFIG;
  const contacts = useMemo(() => buildSupportContacts(effective), [effective]);

  return (
    <div
      role="dialog"
      aria-label="Liên hệ hỗ trợ"
      className="w-[min(320px,calc(100vw-2rem))] max-h-[min(480px,calc(100dvh-140px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
    >
      <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-800">{effective.popupTitle}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{effective.popupDescription}</p>
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
        {contacts.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-slate-400">Hiện chưa có kênh hỗ trợ nào khả dụng.</p>
        )}
        {contacts.map(c => (
          <SupportContactItem key={c.id} contact={c} onClick={c.id === 'ai' ? onOpenChat : undefined} />
        ))}
      </div>
    </div>
  );
}
