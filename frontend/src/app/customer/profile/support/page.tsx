'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LifeBuoy, ChevronRight, ChevronLeft, Plus, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { listMyTickets, type CustomerTicketSummary } from '@/services/customerSupport.service';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  WAITING_ADMIN: 'Chờ phản hồi',
  WAITING_CUSTOMER: 'Chờ bạn phản hồi',
  RESOLVED: 'Đã xử lý',
  CLOSED: 'Đã đóng',
};

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_ADMIN: 'bg-amber-100 text-amber-700',
  WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export default function CustomerSupportPage() {
  const { token, isHydrated } = useAuthStore();
  const [tickets, setTickets] = useState<CustomerTicketSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listMyTickets(token, page, limit);
      setTickets(res.data.items ?? []);
      setTotal(res.data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Tải dữ liệu thất bại.');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <LifeBuoy size={20} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Yêu cầu hỗ trợ của tôi</h1>
            <p className="text-xs text-slate-400">Theo dõi trạng thái xử lý phiếu hỗ trợ kỹ thuật</p>
          </div>
        </div>
        <Link
          href="/support"
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo phiếu mới
        </Link>
      </div>

      {/* Content */}
      <div className="p-5">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center">
            <LifeBuoy className="mx-auto h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm text-slate-500">Bạn chưa có phiếu hỗ trợ nào.</p>
            <Link href="/support" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
              Tạo yêu cầu hỗ trợ ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <Link
                key={t.id}
                href={`/customer/profile/support/${t.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary-700">{t.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700 truncate">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{t.category} · {new Date(t.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>{total} phiếu</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 py-1.5">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
