import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function DashboardPage() {
  return (
    <section>
      <AdminPageHeader title="Tổng quan" />
      <div className="ui-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6">
        <p className="text-sm text-slate-600">Khu vực tổng quan sẽ được phát triển sau.</p>
      </div>
    </section>
  );
}
