import { apiRequest } from './http.client';

export interface CreateTicketPayload {
  name: string;
  phone: string;
  email?: string;
  category: string;
  subject: string;
  detail: string;
}

export interface TicketCreatedResult {
  code: string;
  accessToken: string;
}

export const createSupportTicket = (payload: CreateTicketPayload, token?: string) =>
  apiRequest<{ success: boolean; data: TicketCreatedResult }>(
    '/support/tickets',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );

export interface SupportMessage {
  id: number;
  sender: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  senderName: string;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  code: string;
  status: string;
  category: string;
  subject: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export const getTicketGuest = (code: string, accessToken: string) =>
  apiRequest<{ success: boolean; data: SupportTicket }>(
    `/support/ticket?code=${encodeURIComponent(code)}&token=${encodeURIComponent(accessToken)}`,
  );

export const addGuestMessage = (ticketId: number, body: string, token?: string) =>
  apiRequest<{ success: boolean; data: SupportMessage }>(
    `/support/ticket/${ticketId}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
    token,
  );
