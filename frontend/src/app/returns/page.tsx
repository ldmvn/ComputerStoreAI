import type { Metadata } from 'next';
import Link from 'next/link';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout, { Section } from '@/components/layout/InfoPageLayout';

export const metadata: Metadata = {
  title: 'Đổi trả & Hoàn tiền — DUCMANH PC',
  description: 'Hướng dẫn yêu cầu đổi trả và hoàn tiền tại DUCMANH PC.',
};

const toc = [
  { id: 'dieu-kien', label: 'Điều kiện đổi trả' },
  { id: 'quy-trinh', label: 'Quy trình yêu cầu' },
  { id: 'hoan-tien', label: 'Hoàn tiền' },
  { id: 'khong-ap-dung', label: 'Không áp dụng' },
];

export default function ReturnsPage() {
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Đổi trả & Hoàn tiền' }]}
        title="Đổi trả & Hoàn tiền"
        description="DUCMANH PC hỗ trợ đổi trả nhanh chóng, đảm bảo quyền lợi tối đa cho khách hàng."
        toc={toc}
      >
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <strong className="font-semibold">Cam kết đổi trả trong 7 ngày</strong> — nếu sản phẩm lỗi hoặc không đúng mô tả, chúng tôi sẽ hỗ trợ đổi ngay.
        </div>

        <Section id="dieu-kien" title="1. Điều kiện đổi trả hợp lệ">
          <ul className="list-disc pl-5 space-y-1">
            <li>Sản phẩm còn trong thời hạn đổi trả (7 ngày kể từ ngày nhận hàng).</li>
            <li>Còn nguyên hộp, phụ kiện, tem niêm phong đầy đủ như khi mua.</li>
            <li>Có hóa đơn mua hàng hoặc xác nhận đơn từ hệ thống.</li>
            <li>Lỗi thuộc về nhà sản xuất hoặc do DUCMANH PC giao sai sản phẩm.</li>
          </ul>
        </Section>

        <Section id="quy-trinh" title="2. Quy trình yêu cầu đổi trả">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Liên hệ DUCMANH PC</strong> — Gọi hotline <a href="tel:0386220065" className="text-primary-700 hover:underline">0386220065</a> hoặc email <a href="mailto:luuducmanh.main@gmail.com" className="text-primary-700 hover:underline">luuducmanh.main@gmail.com</a>.
            </li>
            <li><strong>Mô tả vấn đề</strong> — Cung cấp mã đơn hàng, tên sản phẩm và mô tả tình trạng lỗi (kèm ảnh/video nếu có).</li>
            <li><strong>Gửi sản phẩm về</strong> — Đóng gói cẩn thận và gửi về địa chỉ cửa hàng hoặc mang trực tiếp.</li>
            <li><strong>Kiểm tra & xử lý</strong> — Nhân viên kiểm tra trong 3–5 ngày làm việc và xác nhận kết quả.</li>
            <li><strong>Nhận hàng mới hoặc hoàn tiền</strong> — Tùy trường hợp cụ thể và thỏa thuận với khách hàng.</li>
          </ol>
        </Section>

        <Section id="hoan-tien" title="3. Chính sách hoàn tiền">
          <p>Trong trường hợp không có hàng để đổi hoặc khách hàng không muốn đổi sản phẩm khác:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Hoàn tiền qua chuyển khoản trong 3–5 ngày làm việc.</li>
            <li>Hoàn tiền mặt tại cửa hàng (áp dụng cho trường hợp mang trực tiếp).</li>
            <li>Hoàn về ví MoMo hoặc VNPAY nếu ban đầu thanh toán qua các kênh này.</li>
          </ul>
        </Section>

        <Section id="khong-ap-dung" title="4. Trường hợp không áp dụng đổi trả">
          <ul className="list-disc pl-5 space-y-1">
            <li>Sản phẩm đã qua sử dụng, có dấu vết trầy xước hoặc hư hỏng do người dùng.</li>
            <li>Bao bì, tem niêm phong bị mở hoặc thiếu phụ kiện.</li>
            <li>Hết thời hạn đổi trả.</li>
            <li>Sản phẩm trong danh mục không áp dụng đổi trả (vật tư tiêu hao, phần mềm đã kích hoạt).</li>
          </ul>
        </Section>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-800">Xem thêm</p>
          <div className="mt-2 space-y-1">
            <Link href="/policy/return" className="block text-primary-700 hover:underline">→ Chính sách đổi trả đầy đủ</Link>
            <Link href="/policy/warranty" className="block text-primary-700 hover:underline">→ Chính sách bảo hành</Link>
          </div>
        </div>
      </InfoPageLayout>
    </CustomerShell>
  );
}
