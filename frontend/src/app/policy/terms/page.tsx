import type { Metadata } from 'next';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout, { Section } from '@/components/layout/InfoPageLayout';
import { getPublicPolicyPage } from '@/services/contentPage.service';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng — DUCMANH PC',
  description: 'Điều khoản sử dụng dịch vụ tại DUCMANH PC.',
};

const toc = [
  { id: 'chap-nhan', label: 'Chấp nhận điều khoản' },
  { id: 'dich-vu', label: 'Sử dụng dịch vụ' },
  { id: 'tai-khoan', label: 'Tài khoản người dùng' },
  { id: 'don-hang', label: 'Đặt hàng & Thanh toán' },
  { id: 'so-huu-tri-tue', label: 'Sở hữu trí tuệ' },
  { id: 'gioi-han', label: 'Giới hạn trách nhiệm' },
  { id: 'thay-doi', label: 'Thay đổi điều khoản' },
];

function DynamicContent({ html }: { html: string }) {
  return (
    <>
      <div className="policy-content text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .policy-content h2 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 1.4em 0 0.5em; scroll-margin-top: 24px; }
        .policy-content h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 1.2em 0 0.4em; }
        .policy-content p { margin: 0.4em 0; }
        .policy-content ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .policy-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        .policy-content li { margin: 0.2em 0; }
        .policy-content a { color: #c4480a; text-decoration: underline; }
      `}</style>
    </>
  );
}

export default async function TermsPage() {
  const page = await getPublicPolicyPage('terms');
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Điều khoản sử dụng' }]}
        title={page?.title ?? 'Điều khoản sử dụng'}
        description={page?.description ?? 'Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng dịch vụ của DUCMANH PC.'}
        badge="Pháp lý"
        toc={toc}
      >
        {page?.contentHtml ? <DynamicContent html={page.contentHtml} /> : (<>
        <p className="mb-6 text-sm text-slate-500">Cập nhật lần cuối: 11/10/2026</p>

        <Section id="chap-nhan" title="1. Chấp nhận điều khoản">
          <p>Bằng việc truy cập và sử dụng website DUCMANH PC, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện được quy định dưới đây.</p>
        </Section>

        <Section id="dich-vu" title="2. Sử dụng dịch vụ">
          <p>Website DUCMANH PC được sử dụng cho mục đích mua sắm hợp pháp. Người dùng không được:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Sử dụng website cho mục đích gian lận, lừa đảo hoặc vi phạm pháp luật.</li>
            <li>Cố ý làm ảnh hưởng đến hoạt động của hệ thống.</li>
            <li>Thu thập thông tin của người dùng khác mà không có sự đồng ý.</li>
          </ul>
        </Section>

        <Section id="tai-khoan" title="3. Tài khoản người dùng">
          <p>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập tài khoản. DUCMANH PC không chịu trách nhiệm về mọi hậu quả phát sinh từ việc để lộ thông tin tài khoản của bạn.</p>
        </Section>

        <Section id="don-hang" title="4. Đặt hàng & Thanh toán">
          <p>Mọi đơn hàng đặt qua website đều cần được xác nhận bởi DUCMANH PC. Chúng tôi có quyền từ chối hoặc hủy đơn hàng trong trường hợp thông tin không hợp lệ hoặc hàng hóa không còn hàng.</p>
        </Section>

        <Section id="so-huu-tri-tue" title="5. Sở hữu trí tuệ">
          <p>Toàn bộ nội dung trên website bao gồm logo, hình ảnh, văn bản và thiết kế là tài sản của DUCMANH PC hoặc đối tác cung cấp. Nghiêm cấm sao chép, phân phối hoặc sử dụng thương mại khi chưa có sự cho phép.</p>
        </Section>

        <Section id="gioi-han" title="6. Giới hạn trách nhiệm">
          <p>DUCMANH PC không chịu trách nhiệm về các thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ, bao gồm nhưng không giới hạn ở mất dữ liệu hoặc gián đoạn kinh doanh.</p>
        </Section>

        <Section id="thay-doi" title="7. Thay đổi điều khoản">
          <p>DUCMANH PC có quyền cập nhật các điều khoản này vào bất kỳ lúc nào. Thay đổi có hiệu lực kể từ khi được đăng tải lên website. Việc tiếp tục sử dụng dịch vụ đồng nghĩa với việc bạn chấp nhận điều khoản mới.</p>
        </Section>
        </>)}
      </InfoPageLayout>
    </CustomerShell>
  );
}
