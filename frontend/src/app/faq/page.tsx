'use client';

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout from '@/components/layout/InfoPageLayout';

const FAQS = [
  {
    group: 'Đặt hàng & Mua sắm',
    items: [
      { q: 'Tôi có thể đặt hàng qua những kênh nào?', a: 'Bạn có thể đặt hàng trực tiếp qua website, gọi điện đến hotline 0386220065, hoặc đến mua trực tiếp tại cửa hàng 5 Lê Duẩn, Phường Xuân Hòa, Tỉnh Phú Thọ.' },
      { q: 'Làm thế nào để kiểm tra tình trạng đơn hàng?', a: 'Đăng nhập tài khoản và vào mục "Đơn hàng của tôi" để xem trạng thái từng đơn. Bạn cũng có thể liên hệ hotline để được hỗ trợ nhanh hơn.' },
      { q: 'Tôi có thể hủy đơn hàng không?', a: 'Bạn có thể yêu cầu hủy đơn hàng trước khi đơn được xác nhận xuất kho. Sau khi xuất kho, vui lòng liên hệ trực tiếp để được hỗ trợ.' },
      { q: 'Website có bán hàng cho doanh nghiệp (B2B) không?', a: 'Có. DUCMANH PC hỗ trợ đặt hàng số lượng lớn và có chính sách giá đặc biệt cho doanh nghiệp. Vui lòng liên hệ qua email để trao đổi chi tiết.' },
    ],
  },
  {
    group: 'Thanh toán',
    items: [
      { q: 'DUCMANH PC chấp nhận những hình thức thanh toán nào?', a: 'Chúng tôi chấp nhận: tiền mặt (COD), chuyển khoản ngân hàng, ví MoMo, và thanh toán qua cổng VNPAY (thẻ nội địa & quốc tế).' },
      { q: 'Thanh toán online có an toàn không?', a: 'Có. Mọi giao dịch được mã hóa SSL. Chúng tôi không lưu thông tin thẻ của bạn trên hệ thống.' },
      { q: 'Tôi thanh toán xong nhưng không nhận được xác nhận, phải làm gì?', a: 'Vui lòng kiểm tra thư mục Spam/Junk của email. Nếu vẫn không thấy sau 30 phút, hãy liên hệ hotline 0386220065 để được hỗ trợ.' },
    ],
  },
  {
    group: 'Giao hàng & Vận chuyển',
    items: [
      { q: 'DUCMANH PC giao hàng những khu vực nào?', a: 'Chúng tôi giao hàng toàn quốc qua các đơn vị vận chuyển uy tín.' },
      { q: 'Thời gian giao hàng là bao lâu?', a: 'Nội tỉnh Phú Thọ: 1–2 ngày làm việc. Các tỉnh lân cận: 2–3 ngày. Tỉnh xa: 3–5 ngày làm việc tùy khu vực và đơn vị vận chuyển.' },
      { q: 'Phí vận chuyển được tính như thế nào?', a: 'Phí vận chuyển phụ thuộc vào khối lượng, kích thước sản phẩm và khu vực giao hàng. Chi tiết được hiển thị khi bạn điền địa chỉ ở bước thanh toán.' },
    ],
  },
  {
    group: 'Bảo hành & Đổi trả',
    items: [
      { q: 'Sản phẩm được bảo hành bao lâu?', a: 'Thời gian bảo hành tùy theo từng sản phẩm và nhà sản xuất. Thông tin cụ thể được ghi trên phiếu bảo hành kèm theo sản phẩm.' },
      { q: 'Tôi có thể đổi sản phẩm không vừa ý không?', a: 'DUCMANH PC hỗ trợ đổi trả trong thời hạn quy định nếu sản phẩm còn nguyên vẹn, còn hóa đơn và thuộc diện đổi trả. Xem chi tiết tại Chính sách đổi trả.' },
      { q: 'Quy trình yêu cầu bảo hành như thế nào?', a: 'Liên hệ hotline hoặc đến trực tiếp cửa hàng với sản phẩm và phiếu bảo hành. Nhân viên sẽ kiểm tra và hướng dẫn các bước tiếp theo.' },
    ],
  },
  {
    group: 'Tài khoản & Kỹ thuật',
    items: [
      { q: 'Tôi quên mật khẩu, phải làm gì?', a: 'Nhấn vào "Quên mật khẩu" ở trang đăng nhập và nhập email đăng ký. Hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu về email của bạn.' },
      { q: 'Tôi có thể đăng nhập bằng tài khoản Google không?', a: 'Có. DUCMANH PC hỗ trợ đăng nhập nhanh bằng tài khoản Google.' },
      { q: 'Làm thế nào để xóa tài khoản?', a: 'Vui lòng liên hệ bộ phận hỗ trợ qua email luuducmanh.main@gmail.com để yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan.' },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 py-4 text-left text-sm font-medium text-slate-800 hover:text-primary-700"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-slate-600">{a}</p>}
    </div>
  );
}

export default function FaqPage() {
  const [query, setQuery] = useState('');

  const filtered = FAQS.map(g => ({
    ...g,
    items: g.items.filter(
      item =>
        !query ||
        item.q.toLowerCase().includes(query.toLowerCase()) ||
        item.a.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter(g => g.items.length > 0);

  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Hỏi đáp (FAQs)' }]}
        title="Câu hỏi thường gặp"
        description="Tổng hợp các câu hỏi phổ biến về mua sắm, thanh toán, giao hàng và hỗ trợ tại DUCMANH PC."
      >
        {/* Search */}
        <div className="mb-8 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Tìm câu hỏi..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:max-w-md"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">Không tìm thấy câu hỏi phù hợp với &ldquo;{query}&rdquo;.</p>
        ) : (
          <div className="space-y-8">
            {filtered.map(group => (
              <div key={group.group}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary-700">{group.group}</h2>
                <div className="rounded-xl border border-slate-200 bg-white px-4">
                  {group.items.map(item => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          <p className="font-medium">Không tìm thấy câu trả lời bạn cần?</p>
          <p className="mt-1 text-slate-600">Liên hệ trực tiếp qua hotline <a href="tel:0386220065" className="text-primary-700 hover:underline">0386220065</a> hoặc email <a href="mailto:luuducmanh.main@gmail.com" className="text-primary-700 hover:underline">luuducmanh.main@gmail.com</a>.</p>
        </div>
      </InfoPageLayout>
    </CustomerShell>
  );
}
