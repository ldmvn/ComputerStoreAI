import type { Metadata } from 'next';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout, { Section } from '@/components/layout/InfoPageLayout';

export const metadata: Metadata = {
  title: 'Chính sách đổi trả — DUCMANH PC',
  description: 'Chính sách đổi trả hàng hóa tại DUCMANH PC.',
};

const toc = [
  { id: 'dieu-kien', label: 'Điều kiện đổi trả' },
  { id: 'thoi-han', label: 'Thời hạn đổi trả' },
  { id: 'hang-khong-doi', label: 'Hàng không áp dụng' },
  { id: 'quy-trinh', label: 'Quy trình đổi trả' },
  { id: 'hoan-tien', label: 'Hoàn tiền' },
  { id: 'lien-he', label: 'Liên hệ' },
];

export default function ReturnPolicyPage() {
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Chính sách đổi trả' }]}
        title="Chính sách đổi trả"
        description="DUCMANH PC hỗ trợ đổi trả minh bạch, nhanh chóng, đảm bảo quyền lợi khách hàng."
        badge="Chính sách"
        toc={toc}
      >
        <p className="mb-6 text-sm text-slate-500">Cập nhật lần cuối: 11/10/2026</p>

        <Section id="dieu-kien" title="1. Điều kiện đổi trả">
          <ul className="list-disc pl-5 space-y-1">
            <li>Sản phẩm còn nguyên hộp, tem niêm phong, phụ kiện đầy đủ như lúc mua.</li>
            <li>Có hóa đơn mua hàng hợp lệ từ DUCMANH PC.</li>
            <li>Sản phẩm không có dấu hiệu đã qua sử dụng, trầy xước hoặc hư hỏng do người dùng.</li>
            <li>Lỗi thuộc về nhà sản xuất hoặc giao sai sản phẩm so với đơn đặt hàng.</li>
          </ul>
        </Section>

        <Section id="thoi-han" title="2. Thời hạn đổi trả">
          <p>Khách hàng có quyền yêu cầu đổi/trả trong vòng 7 ngày kể từ ngày nhận hàng, với điều kiện sản phẩm còn nguyên vẹn và đáp ứng các điều kiện nêu trên.</p>
        </Section>

        <Section id="hang-khong-doi" title="3. Sản phẩm không áp dụng đổi trả">
          <ul className="list-disc pl-5 space-y-1">
            <li>Sản phẩm đã được kích hoạt bản quyền phần mềm.</li>
            <li>Sản phẩm bị hư hỏng do lỗi người dùng.</li>
            <li>Sản phẩm trong chương trình khuyến mãi đặc biệt có ghi rõ "Không đổi trả".</li>
            <li>Vật tư tiêu hao (pin, mực in, v.v.).</li>
          </ul>
        </Section>

        <Section id="quy-trinh" title="4. Quy trình đổi trả">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Liên hệ DUCMANH PC qua hotline hoặc email để thông báo yêu cầu đổi/trả.</li>
            <li>Cung cấp hóa đơn mua hàng và mô tả tình trạng sản phẩm.</li>
            <li>Gửi sản phẩm về cửa hàng (hoặc mang trực tiếp).</li>
            <li>Nhân viên kiểm tra và xác nhận yêu cầu trong 3–5 ngày làm việc.</li>
            <li>Đổi sản phẩm mới hoặc hoàn tiền theo thỏa thuận.</li>
          </ol>
        </Section>

        <Section id="hoan-tien" title="5. Chính sách hoàn tiền">
          <p>Trong trường hợp sản phẩm lỗi mà không có hàng đổi, DUCMANH PC sẽ hoàn tiền theo hình thức:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Chuyển khoản ngân hàng trong vòng 3–5 ngày làm việc sau khi xác nhận.</li>
            <li>Hoàn tiền mặt tại cửa hàng (áp dụng khi khách mang trực tiếp).</li>
          </ul>
        </Section>

        <Section id="lien-he" title="6. Liên hệ">
          <ul className="space-y-1">
            <li>📞 Hotline: <a href="tel:0386220065" className="text-primary-700 hover:underline">0386220065</a></li>
            <li>📧 Email: <a href="mailto:luuducmanh.main@gmail.com" className="text-primary-700 hover:underline">luuducmanh.main@gmail.com</a></li>
            <li>📍 Địa chỉ: 5 Lê Duẩn, Phường Xuân Hòa, Tỉnh Phú Thọ</li>
          </ul>
        </Section>
      </InfoPageLayout>
    </CustomerShell>
  );
}
