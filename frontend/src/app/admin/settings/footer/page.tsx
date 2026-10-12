'use client';

import Link from 'next/link';
import { FileText, Pencil } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type PageEntry = { label: string; path: string; editHref: string };

const GROUPS: { title: string; description: string; pages: PageEntry[] }[] = [
  {
    title: 'Giới thiệu & Hướng dẫn',
    description: 'Trang giới thiệu cửa hàng và hướng dẫn mua hàng.',
    pages: [
      { label: 'Giới thiệu DUCMANH PC',  path: '/about', editHref: '/admin/settings/footer/about' },
      { label: 'Hướng dẫn mua hàng',     path: '/guide', editHref: '/admin/settings/footer/guide' },
    ],
  },
  {
    title: 'Vận chuyển',
    description: 'Thông tin giao nhận và vận chuyển.',
    pages: [
      { label: 'Vận chuyển & Giao nhận', path: '/shipping', editHref: '/admin/settings/footer/shipping' },
    ],
  },
  {
    title: 'Chính sách',
    description: 'Các trang chính sách hiển thị trong footer và storefront.',
    pages: [
      { label: 'Chính sách bảo hành',  path: '/policy/warranty', editHref: '/admin/settings/footer/warranty' },
      { label: 'Chính sách bảo mật',   path: '/policy/privacy',  editHref: '/admin/settings/footer/privacy' },
      { label: 'Chính sách đổi trả',   path: '/policy/return',   editHref: '/admin/settings/footer/return' },
      { label: 'Điều khoản sử dụng',   path: '/policy/terms',    editHref: '/admin/settings/footer/terms' },
      { label: 'Chính sách thanh toán', path: '/policy/payment',  editHref: '/admin/settings/footer/payment' },
    ],
  },
];

function PageTable({ pages }: { pages: PageEntry[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trang</th>
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Đường dẫn</th>
          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {pages.map(p => (
          <tr key={p.editHref} className="hover:bg-slate-50 transition">
            <td className="px-5 py-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="font-medium text-slate-800">{p.label}</span>
              </div>
            </td>
            <td className="px-5 py-4 hidden sm:table-cell">
              <a href={p.path} target="_blank" rel="noreferrer"
                className="font-mono text-xs text-primary-700 hover:underline">
                {p.path}
              </a>
            </td>
            <td className="px-5 py-4 text-right">
              <Link
                href={p.editHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 transition"
              >
                <Pencil className="h-3 w-3" />
                Chỉnh sửa
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FooterManagerPage() {
  return (
    <AdminGuard permission="settings:view">
      <section className="space-y-6">
        <AdminPageHeader title="Quản lý nội dung trang" />

        {GROUPS.map(g => (
          <div key={g.title} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-800">{g.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{g.description}</p>
            </div>
            <PageTable pages={g.pages} />
          </div>
        ))}
      </section>
    </AdminGuard>
  );
}
