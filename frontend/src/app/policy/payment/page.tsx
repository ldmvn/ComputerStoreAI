import type { Metadata } from 'next';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout, { Section } from '@/components/layout/InfoPageLayout';

export const metadata: Metadata = {
  title: 'Chính sách thanh toán — DUCMANH PC',
  description: 'Các phương thức và chính sách thanh toán tại DUCMANH PC.',
};

const toc = [
  { id: 'phuong-thuc', label: 'Phương thức thanh toán' },
  { id: 'bao-mat', label: 'Bảo mật thanh toán' },
  { id: 'xac-nhan', label: 'Xác nhận đơn hàng' },
  { id: 'hoan-tien', label: 'Hoàn tiền' },
];

export default function PaymentPolicyPage() {
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Chính sách thanh toán' }]}
        title="Chính sách thanh toán"
        description="DUCMANH PC hỗ trợ nhiều phương thức thanh toán linh hoạt, an toàn và tiện lợi."
        badge="Chính sách"
        toc={toc}
      >
        <p className="mb-6 text-sm text-slate-500">Cập nhật lần cuối: 11/10/2026</p>

        <Section id="phuong-thuc" title="1. Phương thức thanh toán được chấp nhận">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800">💵 Thanh toán khi nhận hàng (COD)</p>
              <p className="mt-1 text-slate-600">Thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng khi nhận sản phẩm.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800">🏦 Chuyển khoản ngân hàng</p>
              <p className="mt-1 text-slate-600">Chuyển khoản theo thông tin tài khoản được cung cấp sau khi đặt hàng.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800">📱 Ví MoMo</p>
              <p className="mt-1 text-slate-600">Thanh toán qua ví điện tử MoMo.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800">💳 VNPAY / Thẻ ngân hàng</p>
              <p className="mt-1 text-slate-600">Thanh toán qua cổng VNPAY, hỗ trợ thẻ ATM nội địa và thẻ quốc tế.</p>
            </div>
          </div>
        </Section>

        <Section id="bao-mat" title="2. Bảo mật thanh toán">
          <p>Mọi giao dịch qua cổng thanh toán điện tử được mã hóa SSL. DUCMANH PC không lưu trữ thông tin thẻ tín dụng/ghi nợ của khách hàng trên hệ thống.</p>
        </Section>

        <Section id="xac-nhan" title="3. Xác nhận đơn hàng">
          <p>Sau khi thanh toán thành công, khách hàng sẽ nhận được xác nhận qua email. Đơn hàng được xử lý trong vòng 1–2 ngày làm việc sau khi thanh toán được xác nhận.</p>
        </Section>

        <Section id="hoan-tien" title="4. Hoàn tiền">
          <p>Trường hợp đơn hàng bị hủy sau khi đã thanh toán hoặc sản phẩm lỗi không có hàng đổi, DUCMANH PC sẽ hoàn tiền trong vòng 3–5 ngày làm việc qua phương thức thanh toán ban đầu hoặc chuyển khoản ngân hàng.</p>
        </Section>
      </InfoPageLayout>
    </CustomerShell>
  );
}
