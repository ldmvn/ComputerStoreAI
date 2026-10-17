import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

export default function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
