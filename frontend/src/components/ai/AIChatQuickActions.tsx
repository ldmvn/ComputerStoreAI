'use client';

import Link from 'next/link';
import { ShoppingBag, FileText, Cpu } from 'lucide-react';

// Routes verified against the actual App Router tree (frontend/src/app/customer/**),
// not assumed from the task brief.
const ACTIONS = [
  { href: '/customer/products', icon: ShoppingBag, label: 'Tư vấn sản phẩm' },
  { href: '/customer/profile/orders', icon: FileText, label: 'Hỏi đơn hàng' },
  { href: '/customer/build-pc/manual', icon: Cpu, label: 'Build PC' },
] as const;

export default function AIChatQuickActions({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ACTIONS.map(action => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            onClick={onNavigate}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center transition-colors hover:border-primary-200 hover:bg-primary-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium leading-tight text-slate-700">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
