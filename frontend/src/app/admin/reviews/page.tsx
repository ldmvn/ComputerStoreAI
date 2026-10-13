'use client';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, Search, ChevronLeft, ChevronRight, X, Eye, EyeOff, Trash2, Star } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { mediaUrl } from '@/services/http.client';
import {
  adminGetReviewStats, adminListReviews, adminPublishReview, adminHideReview, adminDeleteReview,
  type AdminReview, type AdminReviewStats,
} from '@/services/adminReview.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

const STATUS_OPTS = [
  { value: '', label: 'Tất cả' },
  { value: 'published', label: 'Đã duyệt' },
  { value: 'hidden', label: 'Đang ẩn' },
];

const RATING_OPTS = [
  { value: '', label: 'Tất cả sao' },
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
  { value: '2', label: '2 sao' },
  { value: '1', label: '1 sao' },
];

// ── Detail Modal ───────────────────────────────────────────────────────────────

function ReviewDetailModal({ review, onClose }: { review: AdminReview; onClose: () => void }) {
  return (
    <Modal title="Chi tiết đánh giá" onClose={onClose} scrollableBody>
      <div className="space-y-4">
        {/* Product */}
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          {review.product.imageUrl && (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              <Image src={mediaUrl(review.product.imageUrl)} alt={review.product.name} fill className="object-cover" sizes="48px" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-800">{review.product.name}</p>
            <p className="text-xs text-slate-500">/{review.product.slug}</p>
          </div>
        </div>
        {/* Author */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Người đánh giá</p>
          <p className="mt-0.5 text-sm text-slate-800">{review.author?.fullName ?? 'Ẩn danh'}</p>
          {review.author?.email && <p className="text-xs text-slate-500">{review.author.email}</p>}
        </div>
        {/* Rating & date */}
        <div className="flex items-center gap-4">
          <StarDisplay rating={review.rating} />
          <span className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${review.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {review.isPublished ? 'Đã duyệt' : 'Đang ẩn'}
          </span>
        </div>
        {/* Content */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Nội dung</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{review.content}</p>
        </div>
        {/* Images */}
        {review.images.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Hình ảnh ({review.images.length})</p>
            <div className="flex flex-wrap gap-2">
              {review.images.map((url, i) => (
                <a key={i} href={mediaUrl(url)} target="_blank" rel="noreferrer" className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <Image src={mediaUrl(url)} alt="" fill className="object-cover" sizes="64px" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminReviewsPage() {
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const toast = useToast();
  const confirmAction = useConfirm();

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [stats, setStats] = useState<AdminReviewStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AdminReview | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const [result, statsData] = await Promise.all([
        adminListReviews(token, { page, limit, search: search || undefined, rating: ratingFilter ? Number(ratingFilter) : undefined, status: statusFilter as '' | 'published' | 'hidden' || undefined }),
        adminGetReviewStats(token),
      ]);
      setReviews(result.reviews);
      setTotal(result.total);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, ratingFilter, statusFilter]);

  useEffect(() => { if (isHydrated) load(); }, [isHydrated, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function clearSearch() { setSearchInput(''); setSearch(''); setPage(1); }

  async function handlePublish(r: AdminReview) {
    if (!token) return;
    setActionLoading(r.id); setError(''); setMessage('');
    try {
      if (r.isPublished) {
        await adminHideReview(token, r.id);
        toast.success('Đã ẩn đánh giá.');
      } else {
        await adminPublishReview(token, r.id);
        toast.success('Đã duyệt đánh giá.');
      }
      setReviews(prev => prev.map(item => item.id === r.id ? { ...item, isPublished: !r.isPublished } : item));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thao tác thất bại.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(r: AdminReview) {
    if (!token) return;
    const ok = await confirmAction({ title: 'Xóa đánh giá', description: `Xóa đánh giá của "${r.author?.fullName ?? 'Ẩn danh'}"? Hành động này không thể hoàn tác.`, destructive: true });
    if (!ok) return;
    setActionLoading(r.id); setError(''); setMessage('');
    try {
      await adminDeleteReview(token, r.id);
      toast.success('Đã xóa đánh giá.');
      setReviews(prev => prev.filter(item => item.id !== r.id));
      setTotal(t => t - 1);
      if (stats) setStats({ ...stats, total: stats.total - 1, published: r.isPublished ? stats.published - 1 : stats.published, hidden: !r.isPublished ? stats.hidden - 1 : stats.hidden });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const avgRating = stats
    ? stats.total > 0
      ? (Object.entries(stats.ratingMap).reduce((s, [r, c]) => s + Number(r) * c, 0) / stats.total).toFixed(1)
      : '—'
    : '—';

  return (
    <div>
      <AdminPageHeader title="Quản lý đánh giá" />
      <AdminFeedback message={message} error={error} />

      {/* Stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tổng đánh giá', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50' },
            { label: 'Đã duyệt', value: stats.published, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Đang ẩn', value: stats.hidden, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Điểm trung bình', value: avgRating, color: 'text-primary-700', bg: 'bg-primary-50' },
          ].map(card => (
            <div key={card.label} className={`rounded-xl ${card.bg} p-4`}>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${card.color}`}>{typeof card.value === 'number' ? card.value.toLocaleString('vi-VN') : card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Sản phẩm, khách hàng, nội dung..."
            aria-label="Tìm kiếm đánh giá"
            className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-7 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {searchInput && (
            <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <select value={ratingFilter} onChange={e => { setRatingFilter(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-600 focus:border-primary-400 focus:outline-none">
          {RATING_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className="flex gap-1">
          {STATUS_OPTS.map(opt => (
            <button key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${statusFilter === opt.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
        ) : reviews.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">Không tìm thấy đánh giá nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Khách hàng</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Sao</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 max-w-[240px]">Nội dung</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Ngày gửi</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 max-w-[200px]">
                        {r.product.imageUrl && (
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100">
                            <Image src={mediaUrl(r.product.imageUrl)} alt="" fill className="object-cover" sizes="32px" />
                          </div>
                        )}
                        <span className="truncate text-xs text-slate-700">{r.product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-700">{r.author?.fullName ?? 'Ẩn danh'}</p>
                      {r.author?.email && <p className="text-xs text-slate-400 truncate max-w-[140px]">{r.author.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StarDisplay rating={r.rating} />
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-xs text-slate-600">{r.content}</p>
                      {r.images.length > 0 && <p className="text-xs text-slate-400">{r.images.length} ảnh</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.isPublished ? 'Đã duyệt' : 'Đang ẩn'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap tabular-nums">
                      {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetail(r)} title="Xem chi tiết"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handlePublish(r)}
                          disabled={actionLoading === r.id}
                          title={r.isPublished ? 'Ẩn đánh giá' : 'Duyệt đánh giá'}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition ${r.isPublished ? 'border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700' : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'} disabled:opacity-40`}>
                          {actionLoading === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={actionLoading === r.id}
                          title="Xóa đánh giá"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} đánh giá</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-slate-600">Trang {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {detail && <ReviewDetailModal review={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
