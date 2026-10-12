import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingCart, CreditCard, Package, CheckCircle } from 'lucide-react';
import CustomerShell from '@/components/layout/CustomerShell';
import InfoPageLayout from '@/components/layout/InfoPageLayout';
import { getPublicPolicyPage } from '@/services/contentPage.service';

export const metadata: Metadata = {
  title: 'Hướng dẫn mua hàng — DUCMANH PC',
  description: 'Hướng dẫn từng bước đặt hàng và thanh toán tại DUCMANH PC.',
};

const steps = [
  {
    icon: ShoppingCart,
    step: '01',
    title: 'Chọn sản phẩm',
    desc: 'Duyệt sản phẩm theo danh mục hoặc tìm kiếm theo tên. Xem thông số kỹ thuật, hình ảnh và đánh giá từ người dùng khác trước khi quyết định.',
    tips: ['Dùng bộ lọc để thu hẹp kết quả theo giá, thương hiệu, cấu hình.', 'So sánh nhiều sản phẩm cùng lúc ở trang chi tiết.', 'Thêm vào Yêu thích để lưu sản phẩm xem lại sau.'],
  },
  {
    icon: Package,
    step: '02',
    title: 'Thêm vào giỏ hàng',
    desc: 'Nhấn "Thêm vào giỏ hàng" hoặc "Mua ngay" trên trang chi tiết sản phẩm. Kiểm tra lại số lượng và danh sách sản phẩm trong giỏ trước khi đặt.',
    tips: ['Chọn tick (✓) từng sản phẩm muốn mua trong giỏ hàng.', 'Tổng tiền được tính tự động theo các sản phẩm đã chọn.'],
  },
  {
    icon: CreditCard,
    step: '03',
    title: 'Thanh toán',
    desc: 'Điền địa chỉ giao hàng, chọn phương thức vận chuyển và thanh toán. Kiểm tra lại thông tin đơn hàng trước khi xác nhận.',
    tips: ['Đảm bảo địa chỉ giao hàng chính xác để tránh giao nhầm.', 'Chọn phương thức thanh toán phù hợp: COD, chuyển khoản, MoMo, VNPAY.'],
  },
  {
    icon: CheckCircle,
    step: '04',
    title: 'Nhận hàng',
    desc: 'Sau khi đặt hàng thành công, bạn sẽ nhận email xác nhận. Theo dõi trạng thái đơn hàng trong tài khoản. Kiểm tra sản phẩm kỹ trước khi ký nhận.',
    tips: ['Kiểm tra bao bì và tem niêm phong trước khi nhận.', 'Nếu sản phẩm bị hỏng hóc, từ chối nhận và liên hệ ngay với DUCMANH PC.'],
  },
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

export default async function GuidePage() {
  const page = await getPublicPolicyPage('guide');
  return (
    <CustomerShell>
      <InfoPageLayout
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Hướng dẫn mua hàng' }]}
        title={page?.title ?? 'Hướng dẫn mua hàng'}
        description={page?.description ?? 'Quy trình đặt hàng tại DUCMANH PC đơn giản chỉ với 4 bước. Dưới đây là hướng dẫn chi tiết giúp bạn mua sắm nhanh chóng và an toàn.'}
      >
        {page?.contentHtml ? <DynamicContent html={page.contentHtml} /> : (<>
        {/* Steps */}
        <div className="space-y-6">
          {steps.map(({ icon: Icon, step, title, desc, tips }) => (
            <div key={step} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50">
                <Icon className="h-5 w-5 text-primary-600" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary-600">{step}</span>
                  <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                </div>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{desc}</p>
                {tips.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {tips.map(tip => (
                      <li key={tip} className="flex items-start gap-2 text-sm text-slate-500">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-800">Cần hỗ trợ chọn cấu hình?</p>
            <p className="mt-1 text-slate-600">Liên hệ tư vấn viên qua hotline <a href="tel:0386220065" className="text-primary-700 hover:underline">0386220065</a>.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-800">Xem chính sách liên quan</p>
            <div className="mt-2 space-y-1">
              <Link href="/shipping" className="block text-primary-700 hover:underline">→ Vận chuyển & Giao nhận</Link>
              <Link href="/returns" className="block text-primary-700 hover:underline">→ Đổi trả & Hoàn tiền</Link>
              <Link href="/policy/payment" className="block text-primary-700 hover:underline">→ Chính sách thanh toán</Link>
            </div>
          </div>
        </div>
        </>)}
      </InfoPageLayout>
    </CustomerShell>
  );
}
