import type { Metadata } from 'next';
import BuildProvider from '@/components/build-pc/BuildProvider';
import BuildTable from '@/components/build-pc/BuildTable';
import BuildSummary from '@/components/build-pc/BuildSummary';
import SlotPickerModal from '@/components/build-pc/SlotPickerModal';

export const metadata: Metadata = {
  title: 'Tự chọn linh kiện — DUCMANH PC',
  description: 'Tự tay lựa chọn từng linh kiện để xây dựng cấu hình PC phù hợp với nhu cầu và ngân sách của bạn.',
};

export default function ManualBuildPage() {
  return (
    <BuildProvider>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Tự chọn linh kiện</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chọn từng linh kiện cho cấu hình PC của bạn. Dấu <span className="text-red-500 font-medium">*</span> là bắt buộc.
          </p>
        </div>

        {/* Main layout */}
        <div className="flex flex-col-reverse gap-5 lg:flex-row lg:items-start">
          {/* Table */}
          <div className="flex-1 min-w-0">
            <BuildTable />
          </div>

          {/* Summary — sticky on desktop, bottom on mobile */}
          <div className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-24">
            <BuildSummary />
          </div>
        </div>
      </div>

      {/* Modal — rendered outside the table/summary so it overlays everything */}
      <SlotPickerModal />
    </BuildProvider>
  );
}
