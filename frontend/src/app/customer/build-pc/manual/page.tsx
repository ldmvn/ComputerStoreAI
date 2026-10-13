import Link from 'next/link';
import { Puzzle, ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Tự chọn linh kiện — DUCMANH PC' };

export default function ManualBuildPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="mb-6 flex justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          <Puzzle className="h-8 w-8 text-slate-400" />
        </span>
      </div>
      <h1 className="mb-3 text-2xl font-bold text-slate-900">Tự chọn linh kiện</h1>
      <p className="mb-8 text-slate-500">Tính năng đang được phát triển. Bạn sẽ sớm có thể tự do lựa chọn từng linh kiện để xây dựng cấu hình PC theo ý muốn.</p>
      <Link href="/customer/build-pc" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#C4480A]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quay lại
      </Link>
    </div>
  );
}
