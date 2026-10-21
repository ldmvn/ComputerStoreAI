import { apiRequest } from './http.client';
import type {
  Promotion, PromotionDetail, PromotionStats, PromotionListResult, PromotionInput,
  PromotionCategoryOption, PromotionProductOption, PromotionStatus, PromotionType, PromotionScope,
} from '@/types/promotion.type';

function authHeaders(token: string | null) {
  return { Authorization: `Bearer ${token}` };
}

export async function adminGetPromotionStats(token: string | null): Promise<PromotionStats> {
  return apiRequest('/admin/promotions/stats', { headers: authHeaders(token) });
}

export async function adminListPromotions(
  token: string | null,
  filters: { page?: number; limit?: number; search?: string; status?: PromotionStatus | ''; type?: PromotionType | ''; scope?: PromotionScope | '' } = {}
): Promise<PromotionListResult> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.scope) params.set('scope', filters.scope);
  const qs = params.toString();
  return apiRequest(`/admin/promotions${qs ? `?${qs}` : ''}`, { headers: authHeaders(token) });
}

export async function adminGetPromotion(token: string | null, id: number): Promise<{ promotion: PromotionDetail }> {
  return apiRequest(`/admin/promotions/${id}`, { headers: authHeaders(token) });
}

export async function adminCreatePromotion(token: string | null, data: PromotionInput): Promise<{ promotion: PromotionDetail; message: string }> {
  return apiRequest('/admin/promotions', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(data) });
}

export async function adminUpdatePromotion(token: string | null, id: number, data: PromotionInput): Promise<{ promotion: PromotionDetail; message: string }> {
  return apiRequest(`/admin/promotions/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) });
}

export async function adminTogglePromotion(token: string | null, id: number, isActive: boolean): Promise<{ promotion: Promotion; message: string }> {
  return apiRequest(`/admin/promotions/${id}/toggle`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ isActive }) });
}

export async function adminDeletePromotion(token: string | null, id: number): Promise<{ message: string }> {
  return apiRequest(`/admin/promotions/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

export async function adminListPromotionCategories(token: string | null): Promise<{ categories: PromotionCategoryOption[] }> {
  return apiRequest('/admin/promotions/categories', { headers: authHeaders(token) });
}

export async function adminSearchPromotionProducts(token: string | null, search: string): Promise<{ products: PromotionProductOption[] }> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest(`/admin/promotions/products${qs}`, { headers: authHeaders(token) });
}
