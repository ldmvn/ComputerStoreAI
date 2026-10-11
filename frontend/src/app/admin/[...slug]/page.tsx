import { notFound } from 'next/navigation';
import { dashboardMenuItems } from '@/components/admin/menu.config';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type DashboardPlaceholderPageProps = {
  params: { slug: string[] };
};

export default function DashboardPlaceholderPage({ params }: DashboardPlaceholderPageProps) {
  const path = `/admin/${params.slug.join('/')}`;
  const item = dashboardMenuItems.find((menuItem) => menuItem.path === path);

  if (!item) notFound();

  return (
    <section>
      <AdminPageHeader title={item.label} />
      <div className="ui-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6">
        <p className="text-sm text-slate-600">Trang quản lý {item.label.toLowerCase()} sẽ được phát triển sau.</p>
      </div>
    </section>
  );
}
