'use client';
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Loader2, Star, X } from 'lucide-react';
import { ApiRequestError, mediaUrl } from '@/services/http.client';
import { getProductReviews, submitProductReview } from '@/services/productReview.service';
import { useAuthStore } from '@/store/auth.store';
import type { ProductReview, ProductReviewListResponse, ProductReviewSummary } from '@/types/product.type';

const FILTERS: Array<{ id: 'all' | 1 | 2 | 3 | 4 | 5; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 5, label: '5★' },
  { id: 4, label: '4★' },
  { id: 3, label: '3★' },
  { id: 2, label: '2★' },
  { id: 1, label: '1★' },
];

const PAGE_SIZE = 10;
const MAX_REVIEW_IMAGES = 3;
const sectionClassName = 'min-w-0 scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const headingClassName = 'mb-3 text-lg font-semibold text-slate-900';

type Props = { slug: string; productId: number; initialSummary?: ProductReviewSummary | null };

function StarRating({ value, onChange, readOnly = false, size = 18 }: { value: number; onChange?: (next: number) => void; readOnly?: boolean; size?: number }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="inline-flex items-center gap-0.5" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Đánh giá ${value} trên 5`}>
      {stars.map((star) => {
        const filled = star <= Math.round(value);
        const interactive = !readOnly && Boolean(onChange);
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(star)}
            className={`flex h-7 w-7 items-center justify-center rounded transition ${interactive ? 'hover:bg-primary-50 cursor-pointer' : 'cursor-default'}`}
            aria-label={`${star} sao`}
            aria-pressed={filled}
          >
            <Star size={size} strokeWidth={1.75} className={filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function DistributionBar({ distribution, total }: { distribution: ProductReviewSummary['distribution']; total: number }) {
  const rows = [5, 4, 3, 2, 1] as const;
  return (
    <div className="space-y-1.5">
      {rows.map((star) => {
        const count = distribution?.[star] ?? 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-6 shrink-0 text-right tabular-nums">{star}★</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <span className="w-9 shrink-0 tabular-nums text-slate-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewItem({ review }: { review: ProductReview }) {
  const name = review.author?.fullName || 'Khách hàng';
  const avatar = review.author?.avatarUrl ? mediaUrl(review.author.avatarUrl) : null;
  const createdAt = new Date(review.createdAt);
  const dateLabel = Number.isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'KH';
  return (
    <article className="flex gap-3 border-t border-slate-100 py-4 first:border-t-0 first:pt-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-500" aria-hidden="true">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <StarRating value={review.rating} readOnly size={14} />
          {dateLabel && <span className="text-xs text-slate-400">· {dateLabel}</span>}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{review.content}</p>
        {review.images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {review.images.map((url, index) => (
              <a key={`${review.id}-${index}`} href={mediaUrl(url)} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                <img src={mediaUrl(url)} alt={`Ảnh đánh giá ${index + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function ProductReviews({ slug, productId, initialSummary }: Props) {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [data, setData] = useState<ProductReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const summary: ProductReviewSummary = data?.summary ?? initialSummary ?? { ratingAverage: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const total = useMemo(() => {
    const d = summary.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    return d[1] + d[2] + d[3] + d[4] + d[5];
  }, [summary]);

  const fetchList = useCallback(async (nextFilter: typeof filter, nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProductReviews(slug, { page: nextPage, limit: PAGE_SIZE, rating: nextFilter === 'all' ? undefined : nextFilter });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải đánh giá.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setPage(1);
    void fetchList(filter, 1);
  }, [filter, fetchList]);

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files || []);
    const accepted = list.filter(file => file.type.startsWith('image/')).slice(0, MAX_REVIEW_IMAGES - files.length);
    if (!accepted.length) return;
    previews.forEach(url => URL.revokeObjectURL(url));
    setFiles(prev => [...prev, ...accepted].slice(0, MAX_REVIEW_IMAGES));
    setPreviews(accepted.map(file => URL.createObjectURL(file)));
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const next = prev.filter((_, i) => i !== index);
      previews[index] && URL.revokeObjectURL(previews[index]);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!user) {
      setSubmitError('Vui lòng đăng nhập để gửi đánh giá.');
      return;
    }
    if (content.trim().length < 5) {
      setSubmitError('Nhận xét phải có ít nhất 5 ký tự.');
      return;
    }
    const form = new FormData();
    form.append('rating', String(rating));
    form.append('content', content.trim());
    files.forEach(file => form.append('images', file));
    setSubmitting(true);
    try {
      await submitProductReview(token, slug, form);
      setContent('');
      previews.forEach(url => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviews([]);
      setRating(5);
      setSubmitSuccess('Gửi đánh giá thành công! Đánh giá của bạn đã được ghi nhận.');
      await fetchList(filter, 1);
      setPage(1);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : 'Gửi đánh giá thất bại.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingValue = summary.ratingAverage ?? 0;
  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <section id="product-reviews" tabIndex={-1} aria-labelledby="product-reviews-heading" className={sectionClassName}>
      <h2 id="product-reviews-heading" className={headingClassName}>Nhận xét và Đánh giá</h2>

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-[auto,1fr] sm:items-center sm:gap-6">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <p className="text-4xl font-bold leading-none text-amber-500 sm:text-5xl" aria-label={`Điểm trung bình ${ratingValue.toFixed(1)} trên 5`}>
            {total > 0 ? ratingValue.toFixed(1) : '—'}
          </p>
          <StarRating value={ratingValue} readOnly size={18} />
          <p className="text-xs text-slate-500">{total > 0 ? `${total.toLocaleString('vi-VN')} lượt đánh giá` : 'Chưa có đánh giá'}</p>
        </div>
        <DistributionBar distribution={summary.distribution} total={total} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Lọc đánh giá theo số sao">
        {FILTERS.map((option) => {
          const isActive = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(option.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${isActive ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-600'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500" role="status">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Đang tải đánh giá…
          </div>
        ) : error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Chưa có đánh giá nào phù hợp với bộ lọc.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(review => <ReviewItem key={review.id} review={review} />)}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => { const next = page - 1; setPage(next); void fetchList(filter, next); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50">Trang trước</button>
            <span className="text-xs text-slate-500">Trang {meta.page} / {meta.totalPages}</span>
            <button type="button" disabled={page >= meta.totalPages || loading} onClick={() => { const next = page + 1; setPage(next); void fetchList(filter, next); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50">Trang sau</button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby="write-review-heading">
        <h3 id="write-review-heading" className="mb-3 text-sm font-semibold text-slate-900">Gửi đánh giá của bạn</h3>
        {!user && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Vui lòng đăng nhập để gửi đánh giá.</p>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Chọn số sao</span>
          <StarRating value={rating} onChange={setRating} size={20} />
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Nhận xét
          <textarea
            value={content}
            onChange={event => setContent(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm…"
            className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <span className="mt-1 block text-right text-[11px] text-slate-400">{content.length}/2000</span>
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-300 hover:text-primary-600 ${files.length >= MAX_REVIEW_IMAGES ? 'pointer-events-none opacity-50' : ''}`}>
            <Camera size={14} aria-hidden="true" />
            Đính kèm ảnh ({files.length}/{MAX_REVIEW_IMAGES})
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </label>
          {previews.map((url, index) => (
            <span key={url} className="relative inline-block h-12 w-12 overflow-hidden rounded-md border border-slate-200">
              <img src={url} alt={`Ảnh ${index + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => removeFile(index)} className="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center rounded-bl-md bg-slate-900/70 text-white" aria-label="Xóa ảnh">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        {submitError && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</p>}
        {submitSuccess && <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{submitSuccess}</p>}
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Gửi đánh giá
          </button>
        </div>
      </form>
    </section>
  );
}
