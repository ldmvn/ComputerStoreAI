'use client';
import { useState } from 'react';
import { TicketPercent, Gift } from 'lucide-react';
import VoucherTab from './VoucherTab';
import PromotionTab from './PromotionTab';

type TabKey = 'voucher' | 'promotion';

export default function AdminPromotionsPage() {
  const [tab, setTab] = useState<TabKey>('voucher');

  const tabs: { key: TabKey; label: string; icon: typeof TicketPercent }[] = [
    { key: 'voucher', label: 'Voucher giảm giá', icon: TicketPercent },
    { key: 'promotion', label: 'Khuyến mãi & Quà tặng', icon: Gift },
  ];

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${active ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Both tabs stay mounted (hidden via CSS) so search/filter state and scroll
          position survive switching tabs and returning from an edit. */}
      <div className={tab === 'voucher' ? '' : 'hidden'}><VoucherTab /></div>
      <div className={tab === 'promotion' ? '' : 'hidden'}><PromotionTab /></div>
    </div>
  );
}
