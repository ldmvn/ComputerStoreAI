'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin, MessageSquare, Clock, Copy, CheckCheck } from 'lucide-react';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout from '@/components/layout/InfoPageLayout';
import { createSupportTicket, type TicketCreatedResult } from '@/services/support.service';
import { useAuthStore } from '@/store/auth.store';

const CATEGORIES = ['Lỗi kỹ thuật sản phẩm', 'Cài đặt & Phần mềm', 'Kết nối & Mạng', 'Linh kiện & Nâng cấp', 'Khác'];

export default function SupportPage() {
  const { token } = useAuthStore();
  const [form, setForm] = useState({ name: '', phone: '', email: '', category: '', subject: '', detail: '' });
  const [result, setResult] = useState<TicketCreatedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [copied, setCopied] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập họ tên.';
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại.';
    if (!form.category) e.category = 'Vui lòng chọn loại hỗ trợ.';
    if (!form.subject.trim()) e.subject = 'Vui lòng nhập tiêu đề vấn đề.';
    if (!form.detail.trim()) e.detail = 'Vui lòng mô tả vấn đề.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await createSupportTicket({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        category: form.category,
        subject: form.subject.trim(),
        detail: form.detail.trim(),
      }, token ?? undefined);
      setResult(res.data);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCode() {
    if (!result) return;
    navigator.clipboard.writeText(result.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const field = (id: keyof typeof form, label: string, el: React.ReactNode) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {el}
      {errors[id] && <p className="mt-1 text-xs text-red-600">{errors[id]}</p>}
    </div>
  );

  const inputCls = (id: string) =>
    `w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 ${errors[id] ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'}`;

  const ticketUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/support/ticket?code=${result.code}&token=${result.accessToken}`
    : '';

  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Hỗ trợ kỹ thuật' }]}
        title="Hỗ trợ kỹ thuật"
        description="Đội ngũ kỹ thuật DUCMANH PC sẵn sàng hỗ trợ bạn qua điện thoại, email hoặc phiếu hỗ trợ trực tuyến."
      >
        <div className="grid gap-8 md:grid-cols-[1fr_280px]">
          {/* Form / Success */}
          <div>
            <h2 className="mb-4 text-base font-semibold text-slate-900">Gửi yêu cầu hỗ trợ</h2>

            {result ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="text-2xl text-center">✓</p>
                <p className="mt-2 text-center font-semibold text-emerald-800">Yêu cầu đã được gửi thành công!</p>
                <p className="mt-1 text-center text-sm text-emerald-700">Đội ngũ kỹ thuật sẽ phản hồi trong thời gian sớm nhất.</p>

                <div className="mt-5 rounded-lg border border-emerald-300 bg-white p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mã phiếu hỗ trợ</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-slate-900">{result.code}</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 transition"
                        title="Sao chép mã phiếu"
                      >
                        {copied ? <CheckCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Lưu lại mã phiếu và đường dẫn bên dưới để tra cứu trạng thái xử lý bất kỳ lúc nào.
                  </p>
                  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500 mb-1">Đường dẫn tra cứu phiếu:</p>
                    <a
                      href={ticketUrl}
                      className="break-all text-xs text-primary-700 hover:underline"
                    >
                      {ticketUrl}
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-5 w-full text-sm text-primary-700 hover:underline"
                  onClick={() => {
                    setResult(null);
                    setForm({ name: '', phone: '', email: '', category: '', subject: '', detail: '' });
                  }}
                >
                  Gửi yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Honeypot — hidden from real users */}
                <input type="text" name="_honeypot" aria-hidden="true" tabIndex={-1}
                  className="hidden" autoComplete="off" />

                {field('name', 'Họ và tên *', (
                  <input id="name" type="text" value={form.name} placeholder="Nguyễn Văn A"
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls('name')} />
                ))}
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('phone', 'Số điện thoại *', (
                    <input id="phone" type="tel" value={form.phone} placeholder="09xxxxxxxx"
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className={inputCls('phone')} />
                  ))}
                  {field('email', 'Email (không bắt buộc)', (
                    <input id="email" type="email" value={form.email} placeholder="email@example.com"
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls('email')} />
                  ))}
                </div>
                {field('category', 'Loại hỗ trợ *', (
                  <select id="category" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={inputCls('category')}>
                    <option value="">-- Chọn loại hỗ trợ --</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ))}
                {field('subject', 'Tiêu đề vấn đề *', (
                  <input id="subject" type="text" value={form.subject}
                    placeholder="VD: Máy tính không khởi động được"
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className={inputCls('subject')} />
                ))}
                {field('detail', 'Mô tả vấn đề *', (
                  <textarea id="detail" rows={4} value={form.detail}
                    placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."
                    onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                    className={inputCls('detail')} />
                ))}
                {serverError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {serverError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </form>
            )}
          </div>

          {/* Contact info */}
          <aside className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Liên hệ trực tiếp</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <div>
                  <p className="font-medium text-slate-700">Hotline hỗ trợ</p>
                  <a href="tel:0386220065" className="text-primary-700 hover:underline">0386220065</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <div>
                  <p className="font-medium text-slate-700">Email</p>
                  <a href="mailto:luuducmanh.main@gmail.com" className="break-all text-primary-700 hover:underline">luuducmanh.main@gmail.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <div>
                  <p className="font-medium text-slate-700">Cửa hàng</p>
                  <p className="text-slate-600">5 Lê Duẩn, Phường Xuân Hòa, Tỉnh Phú Thọ</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <div>
                  <p className="font-medium text-slate-700">Giờ làm việc</p>
                  <p className="text-slate-600">Thứ 2 – Thứ 7: 8:00 – 18:00</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <p className="font-medium text-slate-700">Chat Facebook</p>
              </div>
              <a href="https://www.facebook.com/ldmahz/" target="_blank" rel="noopener noreferrer"
                className="mt-2 block text-primary-700 hover:underline">
                facebook.com/ldmahz
              </a>
            </div>
          </aside>
        </div>
      </InfoPageLayout>
    </CustomerShell>
  );
}
