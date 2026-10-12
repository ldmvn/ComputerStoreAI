import { apiRequest } from './http.client';

export interface CustomerSupportMessage {
  id: number;
  sender: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  senderName: string;
  body: string;
  createdAt: string;
}

export interface CustomerTicketSummary {
  id: number;
  code: string;
  status: string;
  category: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTicketDetail extends CustomerTicketSummary {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  messages: CustomerSupportMessage[];
}

export interface ListMyTicketsResult {
  items: CustomerTicketSummary[];
  total: number;
  page: number;
  limit: number;
}

export const listMyTickets = (token: string, page = 1, limit = 20) =>
  apiRequest<{ success: boolean; data: ListMyTicketsResult }>(
    `/customer/support?page=${page}&limit=${limit}`,
    {},
    token,
  );

export const getMyTicket = (token: string, id: number) =>
  apiRequest<{ success: boolean; data: CustomerTicketDetail }>(
    `/customer/support/${id}`,
    {},
    token,
  );

export const addMyMessage = (token: string, id: number, body: string) =>
  apiRequest<{ success: boolean; data: CustomerSupportMessage; newStatus: string }>(
    `/customer/support/${id}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
    token,
  );
