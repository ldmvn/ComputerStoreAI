import type { Metadata } from 'next';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout, { Section } from '@/components/layout/InfoPageLayout';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật — DUCMANH PC',
  description: 'Chính sách bảo mật thông tin khách hàng tại DUCMANH PC.',
};

const toc = [
  { id: 'thu-thap', label: 'Thông tin thu thập' },
  { id: 'muc-dich', label: 'Mục đích sử dụng' },
  { id: 'chia-se', label: 'Chia sẻ thông tin' },
  { id: 'bao-mat', label: 'Bảo mật dữ liệu' },
  { id: 'quyen', label: 'Quyền của khách hàng' },
  { id: 'cookie', label: 'Cookie' },
  { id: 'lien-he', label: 'Liên hệ' },
];

export default function PrivacyPolicyPage() {
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Chính sách bảo mật' }]}
        title="Chính sách bảo mật"
        description="DUCMANH PC coi trọng quyền riêng tư của khách hàng và cam kết bảo vệ thông tin cá nhân."
        badge="Chính sách"
        toc={toc}
      >
        <p className="mb-6 text-sm text-slate-500">Cập nhật lần cuối: 11/10/2026</p>

        <Section id="thu-thap" title="1. Thông tin chúng tôi thu thập">
          <p>Khi sử dụng dịch vụ của DUCMANH PC, chúng tôi có thể thu thập các thông tin sau:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Thông tin tài khoản:</strong> họ tên, địa chỉ email, số điện thoại.</li>
            <li><strong>Thông tin giao hàng:</strong> địa chỉ nhận hàng.</li>
            <li><strong>Thông tin giao dịch:</strong> lịch sử mua hàng, phương thức thanh toán.</li>
            <li><strong>Thông tin thiết bị:</strong> địa chỉ IP, loại trình duyệt (qua cookie).</li>
          </ul>
        </Section>

        <Section id="muc-dich" title="2. Mục đích sử dụng thông tin">
          <ul className="list-disc pl-5 space-y-1">
            <li>Xử lý đơn hàng và giao hàng đến đúng địa chỉ.</li>
            <li>Gửi thông báo về trạng thái đơn hàng, bảo hành và hỗ trợ khách hàng.</li>
            <li>Cải thiện trải nghiệm mua sắm và phát triển tính năng website.</li>
            <li>Gửi thông tin khuyến mãi (khi khách hàng đồng ý đăng ký nhận tin).</li>
          </ul>
        </Section>

        <Section id="chia-se" title="3. Chia sẻ thông tin với bên thứ ba">
          <p>DUCMANH PC không bán, trao đổi hoặc chuyển nhượng thông tin cá nhân của khách hàng cho bên thứ ba, ngoại trừ:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Đơn vị vận chuyển để thực hiện giao hàng.</li>
            <li>Cổng thanh toán để xử lý giao dịch (không lưu trữ thông tin thẻ).</li>
            <li>Yêu cầu từ cơ quan pháp luật có thẩm quyền.</li>
          </ul>
        </Section>

        <Section id="bao-mat" title="4. Bảo mật dữ liệu">
          <p>Thông tin của khách hàng được bảo vệ bằng các biện pháp kỹ thuật phù hợp, bao gồm mã hóa mật khẩu và kết nối HTTPS. Chúng tôi không lưu trữ thông tin thẻ tín dụng trực tiếp trên hệ thống.</p>
        </Section>

        <Section id="quyen" title="5. Quyền của khách hàng">
          <ul className="list-disc pl-5 space-y-1">
            <li>Truy cập và cập nhật thông tin cá nhân trong tài khoản.</li>
            <li>Yêu cầu xóa tài khoản và dữ liệu liên quan.</li>
            <li>Hủy đăng ký nhận email quảng cáo bất kỳ lúc nào.</li>
            <li>Liên hệ để khiếu nại về việc sử dụng dữ liệu.</li>
          </ul>
        </Section>

        <Section id="cookie" title="6. Cookie">
          <p>Website sử dụng cookie để lưu giỏ hàng, trạng thái đăng nhập và cải thiện trải nghiệm duyệt web. Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể bị ảnh hưởng.</p>
        </Section>

        <Section id="lien-he" title="7. Liên hệ về quyền riêng tư">
          <ul className="space-y-1">
            <li>📧 Email: <a href="mailto:luuducmanh.main@gmail.com" className="text-primary-700 hover:underline">luuducmanh.main@gmail.com</a></li>
            <li>📞 Hotline: <a href="tel:0386220065" className="text-primary-700 hover:underline">0386220065</a></li>
          </ul>
        </Section>
      </InfoPageLayout>
    </CustomerShell>
  );
}
