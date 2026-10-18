'use client';

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export type SupportContact = {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  iconBgClassName: string;
  iconRoundedClassName?: string;
  hasNotification?: boolean;
  highlighted?: boolean;
};

export default function SupportContactItem({ contact, onClick }: { contact: SupportContact; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md hover:shadow-slate-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 ${contact.highlighted ? 'bg-primary-50 hover:bg-primary-100/70' : ''}`}
    >
      <span className="relative shrink-0">
        <span className={`flex h-11 w-11 items-center justify-center text-white shadow-sm transition-transform duration-200 ease-out group-hover:scale-110 ${contact.iconRoundedClassName ?? 'rounded-full'} ${contact.iconBgClassName}`} aria-hidden="true">
          {contact.icon}
        </span>
        {contact.hasNotification && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-800">{contact.label}</span>
          <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">Online</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{contact.description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-primary-500" aria-hidden="true" />
    </button>
  );
}
