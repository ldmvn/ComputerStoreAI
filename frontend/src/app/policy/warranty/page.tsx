import type { Metadata } from 'next';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout, { Section } from '@/components/layout/InfoPageLayout';
import { getPublicPolicyPage } from '@/services/contentPage.service';

export const metadata: Metadata = {
  title: 'Chính sách bảo hành — DUCMANH PC',
  description: 'Chính sách bảo hành sản phẩm tại DUCMANH PC.',
};

const toc = [
  { id: 'pham-vi', label: 'Phạm vi áp dụng' },
  { id: 'thoi-gian', label: 'Thời gian bảo hành' },
  { id: 'dieu-kien', label: 'Điều kiện bảo hành' },
  { id: 'khong-bao-hanh', label: 'Trường hợp không bảo hành' },
  { id: 'quy-trinh', label: 'Quy trình bảo hành' },
  { id: 'lien-he', label: 'Liên hệ' },
];

// ── Static fallback (used when DB is unavailable) ─────────────────────────────

function StaticContent() {
  return (
    <>
      <p className="mb-6 text-sm text-slate-500">Cập nhật lần cuối: 11/10/2026</p>

      <Section id="pham-vi" title="1. Phạm vi áp dụng">
        <p>Chính sách bảo hành áp dụng cho tất cả sản phẩm được mua tại DUCMANH PC — bao gồm mua trực tiếp tại cửa hàng và đặt hàng qua website.</p>
        <p>Mỗi sản phẩm đều được kèm theo phiếu bảo hành hoặc ghi nhận bảo hành điện tử theo từng danh mục hàng hóa.</p>
      </Section>

      <Section id="thoi-gian" title="2. Thời gian bảo hành">
        <p>Thời gian bảo hành phụ thuộc vào từng nhà sản xuất và danh mục sản phẩm. Khách hàng vui lòng kiểm tra phiếu bảo hành hoặc liên hệ cửa hàng để biết chính xác thời hạn.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Máy tính xách tay (Laptop): 12–24 tháng theo nhà sản xuất</li>
          <li>Máy tính để bàn (PC): 24 tháng theo nhà sản xuất</li>
          <li>Linh kiện, phụ kiện: 12–36 tháng theo nhà sản xuất</li>
          <li>Màn hình: 24 tháng theo nhà sản xuất</li>
        </ul>
      </Section>

      <Section id="dieu-kien" title="3. Điều kiện bảo hành hợp lệ">
        <ul className="list-disc pl-5 space-y-1">
          <li>Sản phẩm còn trong thời hạn bảo hành.</li>
          <li>Còn hóa đơn mua hàng hoặc phiếu bảo hành hợp lệ từ DUCMANH PC.</li>
          <li>Sản phẩm bị lỗi do nhà sản xuất, không phải do người dùng tác động.</li>
          <li>Tem bảo hành (nếu có) còn nguyên vẹn, không bị rách hoặc tẩy xóa.</li>
        </ul>
      </Section>

      <Section id="khong-bao-hanh" title="4. Trường hợp không được bảo hành">
        <ul className="list-disc pl-5 space-y-1">
          <li>Sản phẩm bị hư hỏng do tác động vật lý: va đập, rơi vỡ, bị nước vào.</li>
          <li>Sản phẩm đã qua sửa chữa tại đơn vị khác ngoài hệ thống bảo hành chính hãng.</li>
          <li>Sản phẩm bị oxy hóa, cháy nổ do nguồn điện không ổn định hoặc sử dụng sai cách.</li>
          <li>Hết thời hạn bảo hành.</li>
        </ul>
      </Section>

      <Section id="quy-trinh" title="5. Quy trình thực hiện bảo hành">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Khách hàng liên hệ DUCMANH PC qua hotline hoặc đến trực tiếp cửa hàng.</li>
          <li>Nhân viên kiểm tra tình trạng sản phẩm và xác nhận điều kiện bảo hành.</li>
          <li>Sản phẩm được gửi đến trung tâm bảo hành chính hãng (nếu cần).</li>
          <li>Khách hàng nhận lại sản phẩm sau khi hoàn tất bảo hành. Thời gian xử lý: 3–5 ngày làm việc.</li>
        </ol>
      </Section>

      <Section id="lien-he" title="6. Liên hệ hỗ trợ bảo hành">
        <ul className="space-y-1">
          <li>📞 Hotline: <a href="tel:0386220065" className="text-primary-700 hover:underline">0386220065</a></li>
          <li>📧 Email: <a href="mailto:luuducmanh.main@gmail.com" className="text-primary-700 hover:underline">luuducmanh.main@gmail.com</a></li>
          <li>📍 Địa chỉ: 5 Lê Duẩn, Phường Xuân Hòa, Tỉnh Phú Thọ</li>
        </ul>
      </Section>
    </>
  );
}

// ── Dynamic content from DB ───────────────────────────────────────────────────

function DynamicContent({ html }: { html: string }) {
  return (
    <>
      <div
        className="policy-content text-sm leading-relaxed text-slate-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .policy-content h2 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 1.6em 0 0.5em; scroll-margin-top: 24px; }
        .policy-content h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 1.2em 0 0.4em; }
        .policy-content h4 { font-size: 0.9rem; font-weight: 600; color: #334155; margin: 1em 0 0.3em; }
        .policy-content p { margin: 0.5em 0; }
        .policy-content ul { list-style: disc; padding-left: 1.4em; margin: 0.6em 0; }
        .policy-content ol { list-style: decimal; padding-left: 1.4em; margin: 0.6em 0; }
        .policy-content li { margin: 0.25em 0; }
        .policy-content blockquote { border-left: 3px solid #C4480A; padding-left: 1em; margin: 0.8em 0; color: #64748b; font-style: italic; }
        .policy-content a { color: #c4480a; text-decoration: underline; }
        .policy-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5em 0; }
        .policy-content table { border-collapse: collapse; width: 100%; margin: 1em 0; overflow-x: auto; display: block; }
        .policy-content th, .policy-content td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; white-space: normal; min-width: 80px; }
        .policy-content th { background: #f8fafc; font-weight: 600; }
        @media (max-width: 640px) {
          .policy-content table { font-size: 0.8rem; }
          .policy-content th, .policy-content td { padding: 6px 8px; }
        }
      `}</style>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WarrantyPolicyPage() {
  const page = await getPublicPolicyPage('warranty');

  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Chính sách bảo hành' }]}
        title={page?.title ?? 'Chính sách bảo hành'}
        description={page?.description ?? 'DUCMANH PC cam kết hỗ trợ bảo hành nhanh chóng, minh bạch và đúng cam kết cho mọi sản phẩm.'}
        badge="Chính sách"
        toc={toc}
      >
        {page?.contentHtml
          ? <DynamicContent html={page.contentHtml} />
          : <StaticContent />
        }
      </InfoPageLayout>
    </CustomerShell>
  );
}
