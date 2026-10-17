'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAuthStore } from '@/store/auth.store';
import { type AccountActivity, getAccountActivity, getAccountDetail } from '@/services/accounts.service';

const MODULE_LABELS: Record<string, string> = {
  auth: 'Xác thực',
  products: 'Sản phẩm',
  orders: 'Đơn hàng',
  reviews: 'Đánh giá',
  wishlist: 'Yêu thích',
  addresses: 'Địa chỉ',
  support: 'Hỗ trợ',
  build_pc: 'Build PC',
  profile: 'Hồ sơ',
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  register: 'Đăng ký',
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  view: 'Xem',
  place_order: 'Đặt hàng',
  cancel_order: 'Hủy đơn',
  submit_review: 'Gửi đánh giá',
};

function timeFmt(s: string) {
  return new Date(s).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getModuleLabel(mod: string) {
  return MODULE_LABELS[mod] ?? mod;
}

function getActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    login: 'bg-blue-50 text-blue-700',
    logout: 'bg-slate-100 text-slate-600',
    create: 'bg-emerald-50 text-emerald-700',
    place_order: 'bg-emerald-50 text-emerald-700',
    update: 'bg-amber-50 text-amber-700',
    delete: 'bg-red-50 text-red-600',
    cancel_order: 'bg-red-50 text-red-600',
  };
  const cls = colors[action] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {getActionLabel(action)}
    </span>
  );
}

export default function AccountActivityPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthStore(s => s.token);
  const userId = Number(params.id);

  const [logs, setLogs] = useState<AccountActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [activityRes, detailRes] = await Promise.all([
        getAccountActivity(token, userId, { page: p, limit: 30 }),
        p === 1 ? getAccountDetail(token, userId) : Promise.resolve(null),
      ]);
      setLogs(activityRes.logs);
      setTotal(activityRes.total);
      setPage(p);
      setTotalPages(activityRes.totalPages);
      if (detailRes) setAccountName(detailRes.customer.fullName);
    } catch {
      // If account not found, go back
      router.push('/admin/accounts');
    } finally {
      setLoading(false);
    }
  }, [token, userId, router]);

  useEffect(() => { void load(1); }, [load]);

  return (
    <AdminGuard permission="customers:view">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/accounts')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <AdminPageHeader
            title={`Lịch sử hoạt động${accountName ? ` — ${accountName}` : ''}`}
            description={`${total} hoạt động được ghi nhận`}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-20 text-center text-sm text-slate-400">
            Chưa có hoạt động nào được ghi nhận.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="relative px-6 py-4">
              {/* Timeline */}
              <div className="absolute left-[2.125rem] top-4 bottom-4 w-px bg-slate-100" aria-hidden="true" />
              <ol className="space-y-5">
                {logs.map(log => (
                  <li key={log.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                      {log.success
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <ActionBadge action={log.action} />
                        <span className="text-xs font-medium text-slate-500">
                          {getModuleLabel(log.module)}
                        </span>
                        {log.targetLabel && (
                          <span className="text-xs text-slate-400">→ {log.targetLabel}</span>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400 shrink-0">
                          <Clock className="h-3 w-3" />
                          {timeFmt(log.createdAt)}
                        </span>
                      </div>
                      {log.description && (
                        <p className="mt-1.5 text-sm text-slate-700">{log.description}</p>
                      )}
                      {log.ipAddress && (
                        <p className="mt-1 text-xs text-slate-400">IP: {log.ipAddress}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{total} hoạt động</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Trước
              </button>
              <span className="px-2 py-1.5">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
