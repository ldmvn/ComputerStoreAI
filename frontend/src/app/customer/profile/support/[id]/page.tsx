'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getMyTicket, addMyMessage, type CustomerTicketDetail } from '@/services/customerSupport.service';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  WAITING_ADMIN: 'Chờ phản hồi',
  WAITING_CUSTOMER: 'Chờ bạn phản hồi',
  RESOLVED: 'Đã xử lý',
  CLOSED: 'Đã đóng',
};

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_ADMIN: 'bg-amber-100 text-amber-700',
  WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export default function CustomerTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, isHydrated } = useAuthStore();

  const [ticket, setTicket] = useState<CustomerTicketDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHydrated) return;
    getMyTicket(token, Number(id))
      .then(r => setTicket(r.data))
      .catch(e => setLoadError(e.message ?? 'Không tìm thấy phiếu.'))
      .finally(() => setLoading(false));
  }, [isHydrated, token, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  // Poll every 5 s for new admin replies
  useEffect(() => {
    if (!ticket || ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') return;
    const ticketId = ticket.id;
    const interval = setInterval(async () => {
      try {
        const r = await getMyTicket(token, ticketId);
        setTicket(prev => {
          if (!prev) return prev;
          if (r.data.messages.length !== prev.messages.length || r.data.status !== prev.status) {
            return r.data;
          }
          return prev;
        });
        if (r.data.status === 'CLOSED' || r.data.status === 'RESOLVED') clearInterval(interval);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, token]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket || !reply.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const res = await addMyMessage(token, ticket.id, reply.trim());
      setTicket(t => t ? { ...t, messages: [...t.messages, res.data], status: res.newStatus ?? 'WAITING_ADMIN' } : t);
      setReply('');
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Gửi thất bại. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
        </div>
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <Link href="/customer/profile/support" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
          {loadError || 'Không tìm thấy phiếu.'}
        </div>
      </div>
    );
  }

  const closed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/customer/profile/support"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">{ticket.code}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ticket.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[ticket.status] ?? ticket.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 truncate">{ticket.category} · {ticket.subject}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Messages */}
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {ticket.messages.map(msg => (
            <div
              key={msg.id}
              className={`rounded-xl px-4 py-3 text-sm ${msg.sender === 'ADMIN' ? 'bg-primary-50 border border-primary-100' : msg.sender === 'SYSTEM' ? 'bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-xs' : 'bg-white border border-slate-200'}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`font-medium ${msg.sender === 'ADMIN' ? 'text-primary-700' : 'text-slate-700'}`}>
                  {msg.sender === 'ADMIN' ? `Kỹ thuật viên — ${msg.senderName}` : msg.sender === 'SYSTEM' ? 'Hệ thống' : 'Bạn'}
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

        {/* Reply */}
        {!closed ? (
          <form onSubmit={handleReply} className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Gửi thêm thông tin</h3>
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
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? 'Đang gửi...' : 'Gửi phản hồi'}
            </button>
          </form>
        ) : (
          <p className="border-t border-slate-100 pt-4 text-sm text-slate-500 italic">
            Phiếu này đã được đóng/giải quyết. Nếu cần hỗ trợ thêm, vui lòng tạo phiếu mới.
          </p>
        )}
      </div>
    </div>
  );
}
