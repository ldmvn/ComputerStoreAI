import { apiRequest } from './http.client';

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export interface PolicyPageData {
  id: number;
  pageKey: string;
  title: string;
  description?: string | null;
  contentHtml: string;
  updatedAt: string;
  updatedByAdminId?: number | null;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminGetPolicyPage = (token: string | null, key: string) =>
  apiRequest<{ success: boolean; data: PolicyPageData }>(
    `/admin/content-pages/${key}`, {}, token,
  );

export const adminUpdatePolicyPage = (
  token: string | null,
  key: string,
  payload: { title: string; description?: string; contentHtml: string },
) =>
  apiRequest<{ success: boolean; data: PolicyPageData }>(
    `/admin/content-pages/${key}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );

// ── Public (called from server components) ────────────────────────────────────

export async function getPublicPolicyPage(key: string): Promise<PolicyPageData | null> {
  try {
    const res = await fetch(`${PUBLIC_API}/content/pages/${key}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data: PolicyPageData };
    return json.data ?? null;
  } catch {
    return null;
  }
}
