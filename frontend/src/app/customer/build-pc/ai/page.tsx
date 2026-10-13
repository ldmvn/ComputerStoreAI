import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Tối ưu cùng AI — DUCMANH PC' };

export default function AiBuildPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="mb-6 flex justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50">
          <Sparkles className="h-8 w-8 text-[#C4480A]" />
        </span>
      </div>
      <h1 className="mb-3 text-2xl font-bold text-slate-900">Tối ưu cùng AI</h1>
      <p className="mb-8 text-slate-500">Tính năng đang được phát triển. Trợ lý AI của DUCMANH PC sẽ gợi ý cấu hình tối ưu dựa trên ngân sách và nhu cầu sử dụng của bạn.</p>
      <Link href="/customer/build-pc" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#C4480A]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quay lại
      </Link>
    </div>
  );
}
