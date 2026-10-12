'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import {
  getAdminTicket, addAdminReply, updateTicketStatus,
  type AdminTicketDetail, type TicketStatus,
} from '@/services/adminSupport.service';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'WAITING_ADMIN', label: 'Chờ phản hồi' },
  { value: 'WAITING_CUSTOMER', label: 'Chờ khách hàng' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'NEW', label: 'Mới (cũ)' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý (cũ)' },
];

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_ADMIN: 'bg-amber-100 text-amber-700',
  WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);

  const [ticket, setTicket] = useState<AdminTicketDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendOk, setSendOk] = useState('');

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHydrated || !token) return;
    setLoading(true);
    getAdminTicket(token, Number(id))
      .then(r => setTicket(r.data))
      .catch(e => setLoadError(e.message ?? 'Không tìm thấy phiếu.'))
      .finally(() => setLoading(false));
  }, [isHydrated, token, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  // Poll every 5 s for new customer messages
  useEffect(() => {
    if (!ticket || !token || ticket.status === 'CLOSED') return;
    const ticketId = ticket.id;
    const interval = setInterval(async () => {
      try {
        const r = await getAdminTicket(token, ticketId);
        setTicket(prev => {
          if (!prev) return prev;
          if (r.data.messages.length !== prev.messages.length || r.data.status !== prev.status) {
            return r.data;
          }
          return prev;
        });
        if (r.data.status === 'CLOSED') clearInterval(interval);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, token]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !ticket || !reply.trim()) return;
    setSending(true);
    setSendError('');
    setSendOk('');
    try {
      const res = await addAdminReply(token, ticket.id, reply.trim());
      setTicket(t => t ? { ...t, messages: [...t.messages, res.data], status: res.newStatus ?? 'WAITING_CUSTOMER' } : t);
      setReply('');
      setSendOk('Phản hồi đã được gửi.');
      setTimeout(() => setSendOk(''), 3000);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Gửi thất bại.');
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!token || !ticket) return;
    setStatusLoading(true);
    setStatusError('');
    try {
      const res = await updateTicketStatus(token, ticket.id, status);
      setTicket(t => t ? { ...t, status: res.data.status } : t);
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.');
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div className="space-y-4">
        <Link href="/admin/support-tickets" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {loadError || 'Không tìm thấy phiếu.'}
        </div>
      </div>
    );
  }

  const closed = ticket.status === 'CLOSED';

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={ticket.code}
        action={
          <Link href="/admin/support-tickets"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition">
            <ArrowLeft className="h-4 w-4" /> Danh sách
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Conversation */}
        <div className="space-y-4">
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {ticket.messages.map(msg => (
              <div
                key={msg.id}
                className={`rounded-xl px-4 py-3 text-sm ${msg.sender === 'ADMIN' ? 'bg-primary-50 border border-primary-100' : msg.sender === 'SYSTEM' ? 'bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-xs' : 'bg-white border border-slate-200'}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={`font-medium ${msg.sender === 'ADMIN' ? 'text-primary-700' : 'text-slate-700'}`}>
                    {msg.sender === 'ADMIN' ? `Admin — ${msg.senderName}` : msg.sender === 'SYSTEM' ? 'Hệ thống' : (ticket.customerName || msg.senderName || 'Khách hàng')}
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

          {/* Reply form */}
          {!closed ? (
            <form onSubmit={handleReply} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Gửi phản hồi</h3>
              <textarea
                rows={4}
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Nhập nội dung phản hồi..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              {sendError && <AdminFeedback error={sendError} />}
              {sendOk && <AdminFeedback message={sendOk} />}
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
            <p className="text-sm text-slate-500 italic">Phiếu đã đóng, không thể gửi thêm phản hồi.</p>
          )}
        </div>

        {/* Sidebar: meta + status */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm">
            <h3 className="font-semibold text-slate-800 text-base">Thông tin phiếu</h3>
            <dl className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <dt className="text-slate-400">Mã phiếu</dt>
                <dd className="font-mono font-medium text-slate-800">{ticket.code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Khách hàng</dt>
                <dd className="font-medium text-slate-800">{ticket.customerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">SĐT</dt>
                <dd>{ticket.customerPhone}</dd>
              </div>
              {ticket.customerEmail && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Email</dt>
                  <dd className="break-all">{ticket.customerEmail}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-400">Loại</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Ngày tạo</dt>
                <dd>{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</dd>
              </div>
            </dl>
          </div>

          {/* Status changer */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Trạng thái</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ticket.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {STATUS_OPTIONS.find(o => o.value === ticket.status)?.label ?? ticket.status}
              </span>
            </div>
            {statusError && <p className="text-xs text-red-600">{statusError}</p>}
            <div className="space-y-1">
              {STATUS_OPTIONS.filter(o => o.value !== ticket.status).map(o => (
                <button
                  key={o.value}
                  type="button"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange(o.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50"
                >
                  Chuyển → {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
