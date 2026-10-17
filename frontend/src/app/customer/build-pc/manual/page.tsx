import type { Metadata } from 'next';
import BuildProvider from '@/components/build-pc/BuildProvider';
import BuildTable from '@/components/build-pc/BuildTable';
import BuildSummary from '@/components/build-pc/BuildSummary';
import SlotPickerModal from '@/components/build-pc/SlotPickerModal';
import SharedBuildLoader from '@/components/build-pc/SharedBuildLoader';

export const metadata: Metadata = {
  title: 'Tự chọn linh kiện — DUCMANH PC',
  description: 'Tự tay lựa chọn từng linh kiện để xây dựng cấu hình PC phù hợp với nhu cầu và ngân sách của bạn.',
};

type Props = { searchParams: { code?: string } };

export default function ManualBuildPage({ searchParams }: Props) {
  const code = typeof searchParams.code === 'string' ? searchParams.code.trim() : '';

  return (
    <BuildProvider>
      <div className="w-full space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tự chọn linh kiện</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chọn từng linh kiện cho cấu hình PC của bạn.{' '}
            <span className="text-slate-400">
              * Cần có để lắp thành bộ máy hoàn chỉnh. Bạn vẫn có thể mua lẻ từng linh kiện.
            </span>
          </p>
        </div>

        {/* Shared build banner + loader (only when ?code= present) */}
        {code && (
          <div>
            <SharedBuildLoader initialCode={code} />
          </div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Table */}
          <div className="min-w-0">
            <BuildTable />
          </div>

          {/* Summary — sticky on tablet/desktop, bottom on mobile */}
          <div className="w-full md:sticky md:top-24">
            <BuildSummary />
          </div>
        </div>
      </div>

      {/* Modal — rendered outside the table/summary so it overlays everything */}
      <SlotPickerModal />
    </BuildProvider>
  );
}
