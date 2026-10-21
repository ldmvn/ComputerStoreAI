import { apiRequest } from './http.client';
import type { MyReview, MyReviewsResponse } from '@/types/review.type';

export async function getMyReviews(token: string | null, page = 1, limit = 10): Promise<MyReviewsResponse> {
  return apiRequest<MyReviewsResponse>(`/reviews/me?page=${page}&limit=${limit}`, {}, token);
}

export async function updateMyReview(token: string | null, id: number, data: { rating: number; content: string }): Promise<MyReview> {
  return apiRequest<MyReview>(`/reviews/me/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token);
}

export async function deleteMyReview(token: string | null, id: number): Promise<void> {
  await apiRequest<unknown>(`/reviews/me/${id}`, { method: 'DELETE' }, token);
}
