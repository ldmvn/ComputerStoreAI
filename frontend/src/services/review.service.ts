import type { MyReview, MyReviewsResponse } from '@/types/review.type';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getMyReviews(token: string, page = 1, limit = 10): Promise<MyReviewsResponse> {
  const res = await fetch(`${API}/reviews/me?page=${page}&limit=${limit}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Không thể tải danh sách đánh giá.');
  return res.json();
}

export async function updateMyReview(token: string, id: number, data: { rating: number; content: string }): Promise<MyReview> {
  const res = await fetch(`${API}/reviews/me/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { message?: string }).message || 'Không thể cập nhật đánh giá.');
  }
  return res.json();
}

export async function deleteMyReview(token: string, id: number): Promise<void> {
  const res = await fetch(`${API}/reviews/me/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || 'Không thể xóa đánh giá.');
  }
}
