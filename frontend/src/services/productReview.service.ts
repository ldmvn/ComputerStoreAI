import { apiRequest } from './http.client';
import type { ProductReview, ProductReviewListResponse, ReviewEligibility } from '@/types/product.type';

export type ReviewListQuery = { page?: number; limit?: number; rating?: 1 | 2 | 3 | 4 | 5 };

function queryString(query: ReviewListQuery) {
  const params = new URLSearchParams();
  if (query.page !== undefined && query.page !== null) params.set('page', String(query.page));
  if (query.limit !== undefined && query.limit !== null) params.set('limit', String(query.limit));
  if (query.rating !== undefined) params.set('rating', String(query.rating));
  return params.toString();
}

export const getProductReviews = (slug: string, query: ReviewListQuery = {}, signal?: AbortSignal) =>
  apiRequest<ProductReviewListResponse>(`/products/${encodeURIComponent(slug)}/reviews?${queryString(query)}`, { signal });

export const getReviewEligibility = (slug: string, token: string | null, signal?: AbortSignal) =>
  apiRequest<ReviewEligibility>(`/products/${encodeURIComponent(slug)}/review-eligibility`, { signal }, token);

export const getMyProductReview = (slug: string, token: string | null, signal?: AbortSignal) =>
  apiRequest<{ review: ProductReview | null }>(`/products/${encodeURIComponent(slug)}/my-review`, { signal }, token);

export const submitProductReview = (token: string | null, slug: string, body: FormData) =>
  apiRequest<{ review: ProductReview; message: string }>(`/products/${encodeURIComponent(slug)}/reviews`, { method: 'POST', body }, token);

export const updateProductReview = (token: string | null, slug: string, reviewId: number, data: { rating: number; content: string }) =>
  apiRequest<{ review: ProductReview; message: string }>(`/products/${encodeURIComponent(slug)}/reviews/${reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token);
