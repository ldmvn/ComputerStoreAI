import { apiRequest } from './http.client';
import type { ProductReview, ProductReviewListResponse } from '@/types/product.type';

export type ReviewListQuery = { page?: number; limit?: number; rating?: 1 | 2 | 3 | 4 | 5 };

function queryString(query: ReviewListQuery) {
  const params = new URLSearchParams();
  if (query.page !== undefined && query.page !== null) params.set('page', String(query.page));
  if (query.limit !== undefined && query.limit !== null) params.set('limit', String(query.limit));
  if (query.rating !== undefined) params.set('rating', String(query.rating));
  return params.toString();
}

export const getProductReviews = (slug: string, query: ReviewListQuery = {}, signal?: AbortSignal) => apiRequest<ProductReviewListResponse>(`/products/${encodeURIComponent(slug)}/reviews?${queryString(query)}`, { signal });

export const submitProductReview = (token: string | null, slug: string, body: FormData) => apiRequest<{ review: ProductReview; message: string }>(`/products/${encodeURIComponent(slug)}/reviews`, { method: 'POST', body }, token);
