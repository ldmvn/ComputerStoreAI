import Link from 'next/link';
import { Puzzle, Sparkles, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Build PC — DUCMANH PC' };

export default function BuildPcPage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Xây dựng PC của bạn</h1>
      <p className="mb-8 text-slate-500">Chọn phương thức xây dựng phù hợp với nhu cầu của bạn.</p>
      <div className="flex flex-col gap-4">
        {/* Manual build card */}
        <Link
          href="/customer/build-pc/manual"
          className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
            <Puzzle className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">Tự chọn linh kiện</p>
            <p className="mt-0.5 text-sm text-slate-500">Tự do lựa chọn từng linh kiện theo nhu cầu của bạn.</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#C4480A]" aria-hidden="true" />
        </Link>

        {/* AI build card */}
        <Link
          href="/customer/build-pc/ai"
          className="group flex items-center gap-4 rounded-2xl border border-orange-200/80 bg-orange-50 p-5 transition-all duration-200 hover:border-orange-300 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-white shadow-sm">
            <Sparkles className="h-6 w-6 text-[#C4480A]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-800">Tối ưu cùng AI</p>
              <span className="rounded-full bg-[#C4480A] px-2 py-0.5 text-[10px] font-bold text-white">Mới</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Gợi ý cấu hình tối ưu theo ngân sách và nhu cầu.</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[#C4480A] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
