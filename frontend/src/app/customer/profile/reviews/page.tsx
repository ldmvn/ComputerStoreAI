'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star, ChevronRight, MessageSquare, AlertCircle, RotateCcw,
  Trash2, CheckCircle2, Clock, ShoppingBag, Pencil, PenLine,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { getMyReviews, updateMyReview, deleteMyReview } from '@/services/review.service';
import { mediaUrl } from '@/services/http.client';
import type { MyReview } from '@/types/review.type';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex items-center gap-0.5" role="group" aria-label="Chọn điểm đánh giá">
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${i} sao`}
          aria-pressed={value === i}
          className="p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          <Star className={`h-5 w-5 transition-colors ${i <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} aria-hidden="true" />
        </button>
      ))}
    </span>
  );
}

// ─── review card ──────────────────────────────────────────────────────────────

function ReviewCard({
  review, onDelete, onSave,
}: {
  review: MyReview;
  onDelete: () => void;
  onSave: (id: number, data: { rating: number; content: string }) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editContent, setEditContent] = useState(review.content);
  const [saving, setSaving] = useState(false);
  const long = review.content.length > 200;

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await onSave(review.id, { rating: editRating, content: editContent.trim() });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditRating(review.rating);
    setEditContent(review.content);
    setEditMode(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Product row */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
          {review.product.imageUrl ? (
            <Image src={mediaUrl(review.product.imageUrl)} alt={review.product.name} fill className="object-contain p-1" sizes="40px" />
          ) : (
            <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/products/${review.product.slug}`}
            className="line-clamp-1 text-sm font-medium text-slate-700 hover:text-primary-600">
            {review.product.name}
          </Link>
          <p className="text-xs text-slate-400">{formatDate(review.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end gap-0.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${review.isPublished ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {review.isPublished ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
              {review.isPublished ? 'Đã duyệt' : 'Chờ duyệt'}
            </span>
            {!review.isPublished && (
              <span className="text-[10px] text-slate-400">Thường trong 24–48 giờ</span>
            )}
          </div>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              aria-label={`Sửa đánh giá về ${review.product.name}`}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={onDelete}
            aria-label={`Xóa đánh giá về ${review.product.name}`}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editMode ? (
        <div className="space-y-3 px-4 py-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Điểm đánh giá</p>
            <StarPicker value={editRating} onChange={setEditRating} />
          </div>
          <div>
            <label htmlFor={`review-edit-${review.id}`} className="mb-1.5 block text-xs font-medium text-slate-500">Nội dung</label>
            <textarea
              id={`review-edit-${review.id}`}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleCancel}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              Hủy
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !editContent.trim()}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      ) : (
        /* Read-only content */
        <div className="px-4 py-3">
          <StarRow rating={review.rating} />
          <p className={`mt-2 text-sm leading-relaxed text-slate-700 ${!expanded && long ? 'line-clamp-3' : ''}`}>
            {review.content}
          </p>
          {long && (
            <button onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Thu gọn nội dung đánh giá' : 'Xem thêm nội dung đánh giá'}
              className="mt-1 text-xs text-primary-600 hover:underline">
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
          {review.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.images.map((img, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  <Image src={mediaUrl(img)} alt={`Ảnh ${i+1}`} fill className="object-cover" sizes="64px" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const LIMIT = 10;

export default function ReviewsPage() {
  const { user, token } = useAuthStore();

  const toast   = useToast();
  const confirm = useConfirm();

  const [reviews, setReviews]         = useState<MyReview[]>([]);
  const [total, setTotal]             = useState(0);
  const [publishedCount, setPublished] = useState(0);
  const [pendingCount, setPending]     = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const totalPages = Math.ceil(total / LIMIT);

  const load = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await getMyReviews(token, p, LIMIT);
      setReviews(res.reviews); setTotal(res.total);
      setPublished(res.publishedCount); setPending(res.pendingCount);
      setPage(p);
    } catch { setError('Không thể tải đánh giá của bạn.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  const handleSave = useCallback(async (id: number, data: { rating: number; content: string }) => {
    if (!token) return;
    const updated = await updateMyReview(token, id, data);
    setReviews(prev => prev.map(r => r.id === id ? updated : r));
    toast.success('Đã cập nhật đánh giá. Vui lòng chờ kiểm duyệt lại.');
  }, [token, toast]);

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Xóa đánh giá',
      description: 'Bạn có chắc muốn xóa đánh giá này không?',
      destructive: true,
    });
    if (!ok || !token) return;
    try {
      await deleteMyReview(token, id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setTotal(t => t - 1);
      toast.success('Đã xóa đánh giá.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa.');
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href="/customer/profile" className="hover:text-primary-600">Tài khoản</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="text-slate-700">Đánh giá của tôi</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Star className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Đánh giá của tôi</h1>
              <p className="text-sm text-slate-500">Các đánh giá bạn đã gửi</p>
            </div>
          </div>
          <Link
            href="/customer/profile/orders?status=DELIVERED"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
            Viết đánh giá
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-y border-slate-200">
          {loading ? (
            [1,2,3].map((_, i) => (
              <div key={i} className={`px-5 py-4 ${i < 2 ? 'border-r border-slate-200' : ''}`}>
                <div className="h-7 w-8 animate-pulse rounded bg-slate-100" />
                <div className="mt-1.5 h-3.5 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))
          ) : [
            { label: 'Tổng đánh giá', value: total },
            { label: 'Đã duyệt',       value: publishedCount },
            { label: 'Chờ duyệt',      value: pendingCount },
          ].map((s, i) => (
            <div key={s.label} className={`px-5 py-4 ${i < 2 ? 'border-r border-slate-200' : ''}`}>
              <p className="text-2xl font-bold tabular-nums text-primary-600">{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3 p-4 sm:p-5">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />)
          ) : error ? (
            <div className="py-10 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-red-300" />
              <p className="mt-3 text-sm text-slate-500">{error}</p>
              <button onClick={() => load(page)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare className="h-7 w-7 text-slate-300" />
              </span>
              <p className="mt-3 font-semibold text-slate-700">Bạn chưa có đánh giá nào</p>
              <p className="mt-1 text-sm text-slate-400">Mua hàng và chia sẻ trải nghiệm của bạn</p>
              <Link href="/products"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
                Mua sắm ngay
              </Link>
            </div>
          ) : (
            reviews.map(r => (
              <ReviewCard key={r.id} review={r} onDelete={() => handleDelete(r.id)} onSave={handleSave} />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button onClick={() => load(page - 1)} disabled={page === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => load(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${page === p ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => load(page + 1)} disabled={page === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                Sau
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
