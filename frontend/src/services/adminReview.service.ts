import { apiRequest } from './http.client';

export type ReviewAuthor = { id: number; fullName: string; email: string };
export type ReviewProduct = { id: number; name: string; slug: string; imageUrl: string | null };

export type AdminReview = {
  id: number;
  rating: number;
  content: string;
  images: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  product: ReviewProduct;
  author: ReviewAuthor | null;
};

export type AdminReviewStats = {
  total: number;
  published: number;
  hidden: number;
  ratingMap: Record<number, number>;
};

export type AdminReviewFilters = {
  page?: number;
  limit?: number;
  search?: string;
  rating?: number | '';
  status?: 'published' | 'hidden' | '';
  from?: string;
  to?: string;
};

export type AdminReviewsResult = {
  reviews: AdminReview[];
  total: number;
  page: number;
  limit: number;
};

export async function adminGetReviewStats(token: string | null): Promise<AdminReviewStats> {
  return apiRequest('/admin/reviews/stats', { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminListReviews(token: string | null, filters: AdminReviewFilters = {}): Promise<AdminReviewsResult> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.rating) params.set('rating', String(filters.rating));
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return apiRequest(`/admin/reviews${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminPublishReview(token: string | null, id: number): Promise<{ message: string }> {
  return apiRequest(`/admin/reviews/${id}/publish`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
}

export async function adminHideReview(token: string | null, id: number): Promise<{ message: string }> {
  return apiRequest(`/admin/reviews/${id}/hide`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
}

export async function adminDeleteReview(token: string | null, id: number): Promise<{ message: string }> {
  return apiRequest(`/admin/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}
