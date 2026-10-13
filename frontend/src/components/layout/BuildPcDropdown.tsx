'use client';

import Link from 'next/link';
import { Puzzle, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  onNavigate: () => void;
}

export default function BuildPcDropdown({ onNavigate }: Props) {
  return (
    <div
      id="build-pc-menu"
      role="dialog"
      aria-label="Chọn phương thức xây dựng PC"
      className="absolute right-0 top-full z-50 mt-2 w-[460px] max-w-[calc(100vw-2rem)] origin-top-right animate-in fade-in slide-in-from-top-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 duration-150"
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          Phương thức xây dựng
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          DUCMANH PC
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1 — Manual build */}
        <Link
          href="/customer/build-pc/manual"
          onClick={onNavigate}
          className="group flex flex-col gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C4480A] focus-visible:outline-offset-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
            <Puzzle className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">Tự chọn linh kiện</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Tự do lựa chọn từng linh kiện để xây dựng cấu hình PC theo nhu cầu của bạn.
            </p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-600 transition-colors group-hover:text-[#C4480A]">
            Bắt đầu
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>

        {/* Card 2 — AI build */}
        <Link
          href="/customer/build-pc/ai"
          onClick={onNavigate}
          className="group flex flex-col gap-3 rounded-[18px] border border-orange-200/80 bg-orange-50 p-4 transition-all duration-200 hover:border-orange-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C4480A] focus-visible:outline-offset-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-white shadow-sm">
              <Sparkles className="h-5 w-5 text-[#C4480A]" aria-hidden="true" />
            </div>
            <span className="rounded-full bg-[#C4480A] px-2 py-0.5 text-[10px] font-bold leading-tight text-white">
              Mới
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">Tối ưu cùng AI</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Gợi ý cấu hình PC tối ưu theo ngân sách và nhu cầu sử dụng của bạn.
            </p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-[#C4480A] transition-colors group-hover:text-[#9a3412]">
            Trải nghiệm ngay
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </div>
  );
}
