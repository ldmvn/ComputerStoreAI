import type { Metadata } from 'next';
import Link from 'next/link';
import { Monitor, Cpu, Wrench, Users } from 'lucide-react';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout from '@/components/layout/InfoPageLayout';
import { getPublicPolicyPage } from '@/services/contentPage.service';

export const metadata: Metadata = {
  title: 'Giới thiệu DUCMANH PC',
  description: 'Tìm hiểu về DUCMANH PC — cửa hàng PC & Laptop chính hãng tại Phú Thọ.',
};

const values = [
  { icon: Monitor, title: 'Sản phẩm chính hãng', desc: 'Toàn bộ sản phẩm được nhập từ các nhà phân phối chính thức, đảm bảo nguồn gốc rõ ràng và tem bảo hành hợp lệ.' },
  { icon: Cpu, title: 'Tư vấn chuyên sâu', desc: 'Đội ngũ kỹ thuật viên hiểu sâu về cấu hình PC, sẵn sàng tư vấn lắp máy phù hợp nhu cầu và ngân sách.' },
  { icon: Wrench, title: 'Hỗ trợ sau bán hàng', desc: 'Hỗ trợ kỹ thuật, bảo hành và sửa chữa tại cửa hàng. Khách hàng không bao giờ phải tự xử lý một mình.' },
  { icon: Users, title: 'Khách hàng là trung tâm', desc: 'Mọi quyết định đều xuất phát từ lợi ích của khách hàng — từ giá cả đến dịch vụ và chính sách đổi trả.' },
];

function DynamicContent({ html }: { html: string }) {
  return (
    <>
      <div className="policy-content text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .policy-content h2 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 1.4em 0 0.5em; }
        .policy-content h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 1.2em 0 0.4em; }
        .policy-content p { margin: 0.4em 0; }
        .policy-content ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .policy-content li { margin: 0.2em 0; }
        .policy-content a { color: #c4480a; text-decoration: underline; }
      `}</style>
    </>
  );
}

export default async function AboutPage() {
  const page = await getPublicPolicyPage('about');
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Giới thiệu' }]}
        title={page?.title ?? 'Giới thiệu DUCMANH PC'}
        description={page?.description ?? 'Cửa hàng PC & Laptop chính hãng, uy tín tại Phú Thọ — hơn 10 năm kinh nghiệm trong lĩnh vực công nghệ.'}
      >
        {page?.contentHtml ? <DynamicContent html={page.contentHtml} /> : (<>
        {/* Story */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Câu chuyện của chúng tôi</h2>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>DUCMANH PC ra đời với sứ mệnh đơn giản: mang đến cho người dùng tại Phú Thọ và toàn quốc những sản phẩm công nghệ chính hãng, giá tốt và dịch vụ thực sự tận tâm.</p>
            <p>Chúng tôi tin rằng công nghệ không chỉ là công cụ, mà là người bạn đồng hành trong học tập, làm việc và sáng tạo. Vì vậy, DUCMANH PC không chỉ bán sản phẩm — chúng tôi tư vấn, hỗ trợ và đồng hành cùng khách hàng trong suốt vòng đời sản phẩm.</p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Giá trị cốt lõi</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                  <Icon className="h-4 w-4 text-primary-600" strokeWidth={1.8} />
                </div>
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Products */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Sản phẩm & Dịch vụ</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <p>DUCMANH PC cung cấp đầy đủ các sản phẩm công nghệ bao gồm:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Máy tính xách tay (Laptop) các thương hiệu Asus, Dell, HP, Lenovo, Acer, MSI…</li>
              <li>Máy tính để bàn (Desktop PC) nguyên bộ và linh kiện rời.</li>
              <li>Màn hình, bàn phím, chuột, tai nghe và phụ kiện gaming.</li>
              <li>Thiết bị mạng, ổ cứng, RAM, card đồ họa và linh kiện nâng cấp.</li>
              <li>Dịch vụ lắp đặt, tư vấn cấu hình và bảo trì máy tính.</li>
            </ul>
          </div>
        </section>

        {/* Contact CTA */}
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-5 text-sm">
          <p className="font-semibold text-primary-900">Đến thăm cửa hàng của chúng tôi</p>
          <p className="mt-1 text-primary-800">5 Lê Duẩn, Phường Xuân Hòa, Tỉnh Phú Thọ</p>
          <p className="mt-1 text-primary-800">📞 <a href="tel:0386220065" className="hover:underline">0386220065</a></p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/stores" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Xem địa điểm</Link>
            <Link href="/customer/products" className="rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50">Khám phá sản phẩm</Link>
          </div>
        </div>
        </>)}
      </InfoPageLayout>
    </CustomerShell>
  );
}
