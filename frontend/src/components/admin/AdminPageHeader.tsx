import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
action?: ReactNode;
};

export default function AdminPageHeader({ title, action }: AdminPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
