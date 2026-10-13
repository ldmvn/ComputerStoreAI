'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import {
  listAdminTickets, getAdminTicketStats,
  type AdminTicketSummary, type AdminTicketStats, type TicketStatus,
} from '@/services/adminSupport.service';

const STATUS_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'WAITING_ADMIN', label: 'Chờ phản hồi' },
  { value: 'WAITING_CUSTOMER', label: 'Chờ khách' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'NEW', label: 'Mới (cũ)' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý (cũ)' },
];

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_ADMIN: 'bg-amber-100 text-amber-700',
  WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export default function AdminSupportTicketsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [stats, setStats] = useState<AdminTicketStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        listAdminTickets(token, { page, limit, status: statusFilter || undefined, q: search || undefined }),
        getAdminTicketStats(token),
      ]);
      setTickets(listRes.data.items ?? []);
      setTotal(listRes.data.total);
      setStats(statsRes.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Tải dữ liệu thất bại.');
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, search]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  const totalPages = Math.ceil(total / limit);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Yêu cầu hỗ trợ" />

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { key: 'WAITING_ADMIN', label: 'Chờ phản hồi', color: 'text-amber-600' },
            { key: 'WAITING_CUSTOMER', label: 'Chờ khách', color: 'text-purple-600' },
            { key: 'RESOLVED', label: 'Đã xử lý', color: 'text-emerald-600' },
            { key: 'CLOSED', label: 'Đã đóng', color: 'text-slate-500' },
            { key: 'total', label: 'Tổng', color: 'text-slate-700' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setStatusFilter(key as TicketStatus); setPage(1); }}
              className={`rounded-xl border bg-white p-3 text-left transition hover:border-slate-300 ${statusFilter === key ? 'border-primary-400 ring-1 ring-primary-200' : 'border-slate-200'}`}
            >
              <p className={`text-xl font-bold ${color}`}>{stats[key as keyof AdminTicketStats]}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { setStatusFilter(o.value); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${statusFilter === o.value ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="ml-auto flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm mã, tên, SĐT..."
              className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary-400 w-52"
            />
          </div>
          <button type="submit" className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
            Tìm
          </button>
        </form>
      </div>

      {error && <AdminFeedback error={error} />}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Không có phiếu hỗ trợ nào.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Mã phiếu</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Khách hàng</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">Loại</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Tiêu đề</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/admin/support-tickets/${t.id}`} className="font-mono text-primary-700 hover:underline font-medium">
                      {t.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{t.customerName}</p>
                    <p className="text-xs text-slate-400">{t.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{t.category}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{t.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_OPTIONS.find(o => o.value === t.status)?.label ?? t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                    {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} phiếu</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-2">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
