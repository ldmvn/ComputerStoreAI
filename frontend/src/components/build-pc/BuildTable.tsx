'use client';

import { useBuild } from './BuildProvider';
import BuildRow from './BuildRow';

export default function BuildTable() {
  const { slots, slotsLoading, slotsError, meta } = useBuild();

  if (slotsError) {
    const is503 = slotsError.includes('tạm đóng') || slotsError.includes('503') || slotsError.includes('503');
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        {is503 ? (
          <>
            <p className="text-base font-semibold text-slate-700">Tính năng tạm đóng</p>
            <p className="mt-1 text-sm text-slate-500">
              Chức năng tự chọn linh kiện hiện đang được bảo trì. Vui lòng quay lại sau.
            </p>
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-slate-700">Không tải được danh sách slot</p>
            <p className="mt-1 text-sm text-slate-500">{slotsError}</p>
          </>
        )}
      </div>
    );
  }

  if (slotsLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-28 sm:w-36 animate-pulse rounded bg-slate-100 shrink-0" />
            <div className="h-8 w-32 animate-pulse rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!meta?.manualBuildEnabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-base font-semibold text-slate-700">Tính năng tạm đóng</p>
        <p className="mt-1 text-sm text-slate-500">
          Chức năng tự chọn linh kiện hiện đang được bảo trì.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-t-xl">
        <span className="w-28 sm:w-36 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Linh kiện</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sản phẩm đã chọn</span>
      </div>
      {slots.map(slot => (
        <div key={slot.slug} className="px-4">
          <BuildRow slot={slot} />
        </div>
      ))}
    </div>
  );
}
