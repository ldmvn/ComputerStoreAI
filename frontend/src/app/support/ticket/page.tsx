'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout from '@/components/layout/InfoPageLayout';
import { getTicketGuest, addGuestMessage, type SupportTicket } from '@/services/support.service';
import { useAuthStore } from '@/store/auth.store';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  WAITING_CUSTOMER: 'Chờ khách hàng',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
};

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

function TicketView() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const accessToken = searchParams.get('token') ?? '';
  const { token: authToken } = useAuthStore();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code || !accessToken) { setLoadError('Đường dẫn không hợp lệ.'); return; }
    getTicketGuest(code, accessToken)
      .then(r => setTicket(r.data))
      .catch(e => setLoadError(e.message ?? 'Không tìm thấy phiếu.'));
  }, [code, accessToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket || !reply.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const res = await addGuestMessage(ticket.id, reply.trim(), authToken ?? undefined);
      setTicket(t => t ? { ...t, messages: [...t.messages, res.data] } : t);
      setReply('');
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Gửi thất bại. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  }

  const closed = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED';

  return (
    <InfoPageLayout
      breadcrumbs={[
        { label: 'Trang chủ', href: '/' },
        { label: 'Hỗ trợ kỹ thuật', href: '/support' },
        { label: ticket ? ticket.code : 'Tra cứu phiếu' },
      ]}
      title="Tra cứu phiếu hỗ trợ"
      description="Xem trạng thái xử lý và trao đổi với kỹ thuật viên."
    >
      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {loadError}
        </div>
      ) : !ticket ? (
        <div className="py-12 text-center text-sm text-slate-500">Đang tải...</div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Ticket meta */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Mã phiếu</p>
                <p className="mt-0.5 font-mono font-bold text-slate-900">{ticket.code}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[ticket.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[ticket.status] ?? ticket.status}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-slate-700">
              <div><span className="text-slate-400">Loại: </span>{ticket.category}</div>
              <div><span className="text-slate-400">Tiêu đề: </span>{ticket.subject}</div>
              <div><span className="text-slate-400">Khách hàng: </span>{ticket.customerName}</div>
              <div><span className="text-slate-400">SĐT: </span>{ticket.customerPhone}</div>
            </div>
          </div>

          {/* Conversation */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Hội thoại</h2>
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {ticket.messages.map(msg => (
                <div
                  key={msg.id}
                  className={`rounded-xl px-4 py-3 text-sm ${msg.sender === 'ADMIN' ? 'bg-primary-50 border border-primary-100' : msg.sender === 'SYSTEM' ? 'bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-xs' : 'bg-white border border-slate-200'}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`font-medium ${msg.sender === 'ADMIN' ? 'text-primary-700' : 'text-slate-700'}`}>
                      {msg.sender === 'ADMIN' ? `Kỹ thuật viên — ${msg.senderName}` : msg.sender === 'SYSTEM' ? 'Hệ thống' : msg.senderName}
                    </span>
                    <time className="text-xs text-slate-400 shrink-0">
                      {new Date(msg.createdAt).toLocaleString('vi-VN')}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Reply */}
          {!closed && (
            <form onSubmit={handleSend} className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Phản hồi thêm thông tin</h2>
              <textarea
                rows={4}
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Nhập nội dung phản hồi..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              {sendError && <p className="text-xs text-red-600">{sendError}</p>}
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition"
              >
                {sending ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </form>
          )}
          {closed && (
            <p className="text-sm text-slate-500 italic">Phiếu này đã được đóng/giải quyết, không thể gửi thêm phản hồi.</p>
          )}
        </div>
      )}
    </InfoPageLayout>
  );
}

export default function TicketPage() {
  return (
    <CustomerShell>
      <Suspense fallback={<div className="py-12 text-center text-sm text-slate-500">Đang tải...</div>}>
        <TicketView />
      </Suspense>
    </CustomerShell>
  );
}
