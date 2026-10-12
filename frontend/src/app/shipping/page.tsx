import type { Metadata } from 'next';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout, { Section } from '@/components/layout/InfoPageLayout';
import { getPublicPolicyPage } from '@/services/contentPage.service';

export const metadata: Metadata = {
  title: 'Vận chuyển & Giao nhận — DUCMANH PC',
  description: 'Thông tin vận chuyển, thời gian và phí giao hàng tại DUCMANH PC.',
};

const toc = [
  { id: 'pham-vi', label: 'Phạm vi giao hàng' },
  { id: 'thoi-gian', label: 'Thời gian giao hàng' },
  { id: 'phi', label: 'Phí vận chuyển' },
  { id: 'don-vi', label: 'Đơn vị vận chuyển' },
  { id: 'nhan-hang', label: 'Khi nhận hàng' },
  { id: 'theo-doi', label: 'Theo dõi đơn hàng' },
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
        .policy-content em { font-style: italic; color: #94a3b8; font-size: 0.8rem; }
        .policy-content a { color: #c4480a; text-decoration: underline; }
        .policy-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .policy-content th, .policy-content td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
        .policy-content th { background: #f8fafc; font-weight: 600; }
      `}</style>
    </>
  );
}

export default async function ShippingPage() {
  const page = await getPublicPolicyPage('shipping');
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Vận chuyển & Giao nhận' }]}
        title={page?.title ?? 'Vận chuyển & Giao nhận'}
        description={page?.description ?? 'DUCMANH PC giao hàng toàn quốc với nhiều đơn vị vận chuyển uy tín, đảm bảo hàng đến tay bạn nhanh chóng và an toàn.'}
        toc={toc}
      >
        {page?.contentHtml ? <DynamicContent html={page.contentHtml} /> : (<>
        <Section id="pham-vi" title="1. Phạm vi giao hàng">
          <p>DUCMANH PC giao hàng trên toàn lãnh thổ Việt Nam, bao gồm các tỉnh thành, huyện, xã có dịch vụ bưu chính/vận chuyển.</p>
          <p>Với các khu vực vùng sâu, vùng xa hoặc hải đảo, thời gian giao hàng có thể kéo dài hơn. Vui lòng liên hệ để xác nhận trước khi đặt hàng.</p>
        </Section>

        <Section id="thoi-gian" title="2. Thời gian giao hàng dự kiến">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Khu vực</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Thời gian dự kiến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="px-4 py-3 text-slate-700">Nội tỉnh Phú Thọ</td><td className="px-4 py-3 text-slate-600">1–2 ngày làm việc</td></tr>
                <tr><td className="px-4 py-3 text-slate-700">Hà Nội, các tỉnh lân cận</td><td className="px-4 py-3 text-slate-600">1–3 ngày làm việc</td></tr>
                <tr><td className="px-4 py-3 text-slate-700">Miền Trung</td><td className="px-4 py-3 text-slate-600">3–5 ngày làm việc</td></tr>
                <tr><td className="px-4 py-3 text-slate-700">Miền Nam</td><td className="px-4 py-3 text-slate-600">3–6 ngày làm việc</td></tr>
                <tr><td className="px-4 py-3 text-slate-700">Vùng sâu, vùng xa, hải đảo</td><td className="px-4 py-3 text-slate-600">Liên hệ xác nhận</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">* Thời gian trên tính từ khi đơn hàng được xác nhận và không tính ngày lễ, Tết.</p>
        </Section>

        <Section id="phi" title="3. Phí vận chuyển">
          <p>Phí vận chuyển được tính dựa trên khối lượng, kích thước sản phẩm và khu vực giao hàng. Phí chính xác sẽ hiển thị tại bước thanh toán sau khi bạn nhập địa chỉ.</p>
          <p>Một số chương trình khuyến mãi có thể bao gồm miễn phí vận chuyển. Chi tiết ghi rõ trong từng chương trình.</p>
        </Section>

        <Section id="don-vi" title="4. Đơn vị vận chuyển">
          <p>DUCMANH PC hợp tác với các đơn vị vận chuyển uy tín như: Giao Hàng Nhanh (GHN), Giao Hàng Tiết Kiệm (GHTK), J&amp;T Express, Viettel Post.</p>
          <p>Tùy theo khu vực và trọng lượng hàng hóa, đơn vị vận chuyển phù hợp sẽ được tự động chỉ định.</p>
        </Section>

        <Section id="nhan-hang" title="5. Khi nhận hàng">
          <ul className="list-disc pl-5 space-y-1">
            <li>Kiểm tra bao bì bên ngoài và tem niêm phong trước khi ký nhận.</li>
            <li>Nếu phát hiện bao bì rách, móp méo hoặc dấu hiệu bất thường, ghi chú vào biên bản giao hàng và liên hệ ngay với DUCMANH PC.</li>
            <li>Từ chối nhận hàng nếu sản phẩm bị hư hỏng rõ ràng do vận chuyển.</li>
            <li>Quay video khi mở hộp để làm bằng chứng trong trường hợp cần khiếu nại.</li>
          </ul>
        </Section>

        <Section id="theo-doi" title="6. Theo dõi đơn hàng">
          <p>Sau khi đơn hàng được xuất kho, bạn sẽ nhận thông báo kèm mã vận đơn qua email. Đăng nhập tài khoản và vào "Đơn hàng của tôi" để xem trạng thái cập nhật.</p>
        </Section>
        </>)}
      </InfoPageLayout>
    </CustomerShell>
  );
}
