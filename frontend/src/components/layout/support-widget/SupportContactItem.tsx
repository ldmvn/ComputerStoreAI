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
  href?: string;
};

const ITEM_CLASS =
  'group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm shadow-slate-900/[0.03] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md hover:shadow-slate-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400';

function ItemBody({ contact }: { contact: SupportContact }) {
  return (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center text-white shadow-sm transition-transform duration-200 ease-out group-hover:scale-105 ${contact.iconRoundedClassName ?? 'rounded-full'} ${contact.iconBgClassName}`} aria-hidden="true">
        {contact.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{contact.label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{contact.description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-primary-500" aria-hidden="true" />
    </>
  );
}

export default function SupportContactItem({ contact, onClick }: { contact: SupportContact; onClick?: () => void }) {
  if (contact.href) {
    return (
      <a href={contact.href} target="_blank" rel="noopener noreferrer" className={ITEM_CLASS}>
        <ItemBody contact={contact} />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={ITEM_CLASS}>
      <ItemBody contact={contact} />
    </button>
  );
}
