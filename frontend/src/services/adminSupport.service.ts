import { apiRequest } from './http.client';

export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_ADMIN' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface AdminSupportMessage {
  id: number;
  sender: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  senderName: string;
  body: string;
  createdAt: string;
}

export interface AdminTicketSummary {
  id: number;
  code: string;
  status: TicketStatus;
  category: string;
  subject: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  assignedAdminId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTicketDetail extends AdminTicketSummary {
  messages: AdminSupportMessage[];
}

export interface AdminTicketStats {
  NEW: number;
  IN_PROGRESS: number;
  WAITING_ADMIN: number;
  WAITING_CUSTOMER: number;
  RESOLVED: number;
  CLOSED: number;
  total: number;
}

export interface ListTicketsResult {
  items: AdminTicketSummary[];
  total: number;
  page: number;
  limit: number;
}

export type ListTicketsFilters = {
  page?: number;
  limit?: number;
  status?: TicketStatus | '';
  category?: string;
  q?: string;
};

function qs(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const getAdminTicketStats = (token: string | null) =>
  apiRequest<{ success: boolean; data: AdminTicketStats }>(
    '/admin/support-tickets/stats',
    {},
    token,
  );

export const listAdminTickets = (token: string | null, filters: ListTicketsFilters = {}) =>
  apiRequest<{ success: boolean; data: ListTicketsResult }>(
    `/admin/support-tickets${qs(filters as Record<string, string | number | undefined>)}`,
    {},
    token,
  );

export const getAdminTicket = (token: string | null, id: number) =>
  apiRequest<{ success: boolean; data: AdminTicketDetail }>(
    `/admin/support-tickets/${id}`,
    {},
    token,
  );

export const addAdminReply = (token: string | null, id: number, body: string) =>
  apiRequest<{ success: boolean; data: AdminSupportMessage; newStatus: TicketStatus }>(
    `/admin/support-tickets/${id}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
    token,
  );

export const updateTicketStatus = (token: string | null, id: number, status: TicketStatus) =>
  apiRequest<{ success: boolean; data: AdminTicketSummary }>(
    `/admin/support-tickets/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token,
  );
