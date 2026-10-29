'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useBrandingStore } from '@/store/branding.store';
import { MapPin, Phone, Mail, Shield, Truck, RotateCcw, CreditCard, ChevronDown } from 'lucide-react';

const aboutLinks = [
  { label: 'Giới thiệu DUCMANH PC', href: '/about' },
  { label: 'Hệ thống cửa hàng', href: '/stores' },
];

const supportLinks = [
  { label: 'Hỏi đáp (FAQs)', href: '/faq' },
  { label: 'Hướng dẫn mua hàng', href: '/guide' },
  { label: 'Vận chuyển & Giao nhận', href: '/shipping' },
  { label: 'Đổi trả & Hoàn tiền', href: '/returns' },
  { label: 'Hỗ trợ kỹ thuật', href: '/support' },
];

const policyLinks = [
  { label: 'Chính sách bảo hành', href: '/policy/warranty' },
  { label: 'Chính sách đổi trả', href: '/policy/return' },
  { label: 'Chính sách bảo mật', href: '/policy/privacy' },
  { label: 'Điều khoản sử dụng', href: '/policy/terms' },
  { label: 'Chính sách thanh toán', href: '/policy/payment' },
];

const trustBadges = [
  { icon: Shield,     label: 'Bảo hành chính hãng' },
  { icon: Truck,      label: 'Giao hàng toàn quốc' },
  { icon: RotateCcw,  label: 'Đổi trả 30 ngày' },
  { icon: CreditCard, label: 'Thanh toán an toàn' },
];

function LinkGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {/* Desktop heading */}
      <h3 className="mb-4 hidden text-xs font-semibold uppercase tracking-wider text-slate-500 lg:block">
        {title}
      </h3>
      {/* Mobile accordion toggle */}
      <button
        type="button"
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-slate-800 lg:hidden"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <ul className={`space-y-2.5 ${open ? 'block pb-3' : 'hidden'} lg:block`}>
        {links.map(link => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-slate-600 transition-colors hover:text-primary-600"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer({ compact = false }: { compact?: boolean }) {
  const hydrateBranding = useBrandingStore(s => s.hydrate);
  const logoUrl = useBrandingStore(s => s.logoUrl);
  useEffect(() => { void hydrateBranding(); }, [hydrateBranding]);

  if (compact) {
    return (
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 text-sm sm:flex-row">
          <Link href="/" className="font-bold tracking-tight text-slate-800">DUCMANH PC</Link>
          <Link href="/customer/products" className="text-slate-500 hover:text-primary-700">Khám phá sản phẩm</Link>
          <p className="text-xs text-slate-400">© 2026 DUCMANH PC</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">

      {/* ── Trust Bar ── */}
      <div className="border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 px-3 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={2} />
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">

          {/* Col 1 — Brand */}
          <div>
            <Link href="/" className="mb-2 inline-block">
              <Image src={logoUrl || '/logo.png'} alt="DUCMANH PC" width={160} height={69} className="h-11 w-auto object-contain" unoptimized />
            </Link>
            <p className="mb-5 text-sm font-medium text-slate-600">Kết nối với chúng tôi</p>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span>5 Lê Duẩn, Phường Xuân Hòa, Tỉnh Phú Thọ</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary-600" />
                <a href="tel:0386220065" className="hover:text-primary-600">0386220065</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary-600" />
                <a href="mailto:luuducmanh.main@gmail.com" className="break-all hover:text-primary-600">
                  luuducmanh.main@gmail.com
                </a>
              </li>
            </ul>

            {/* Social icons */}
            <div className="mt-5 flex items-center gap-2">
              <a href="https://www.facebook.com/ldmahz/" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
                <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="18" cy="18" r="18" fill="#1877F2"/>
                  <path d="M23.5 18H20v-2c0-.828.672-1.5 1.5-1.5H23v-3h-2c-2.485 0-4.5 2.015-4.5 4.5V18H14v3h2.5v8h3v-8H22l1.5-3Z" fill="white"/>
                </svg>
              </a>
              <a href="https://m.youtube.com/@ldmg5" aria-label="YouTube" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
                <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="18" cy="18" r="18" fill="#FF0000"/>
                  <path d="M27.6 13.8a2.4 2.4 0 0 0-1.69-1.7C24.24 11.7 18 11.7 18 11.7s-6.24 0-7.91.4a2.4 2.4 0 0 0-1.69 1.7C8 15.47 8 18 8 18s0 2.53.4 4.2a2.4 2.4 0 0 0 1.69 1.7c1.67.4 7.91.4 7.91.4s6.24 0 7.91-.4a2.4 2.4 0 0 0 1.69-1.7C28 20.53 28 18 28 18s0-2.53-.4-4.2Z" fill="white" fillOpacity="0.9"/>
                  <path d="M15.6 20.7V15.3L21 18l-5.4 2.7Z" fill="#FF0000"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/ldmahz" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
                <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <defs>
                    <radialGradient id="ig-g" cx="30%" cy="107%" r="130%">
                      <stop offset="0%" stopColor="#fdf497"/>
                      <stop offset="5%" stopColor="#fdf497"/>
                      <stop offset="45%" stopColor="#fd5949"/>
                      <stop offset="60%" stopColor="#d6249f"/>
                      <stop offset="90%" stopColor="#285AEB"/>
                    </radialGradient>
                  </defs>
                  <circle cx="18" cy="18" r="18" fill="url(#ig-g)"/>
                  <rect x="11" y="11" width="14" height="14" rx="4" stroke="white" strokeWidth="1.8" fill="none"/>
                  <circle cx="18" cy="18" r="3.5" stroke="white" strokeWidth="1.8" fill="none"/>
                  <circle cx="22.5" cy="13.5" r="1" fill="white"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@ldmahz" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
                <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="18" cy="18" r="18" fill="#010101"/>
                  <path d="M22.5 10h-2.8v10.9a2.3 2.3 0 0 1-2.3 2.2 2.3 2.3 0 0 1-2.3-2.3 2.3 2.3 0 0 1 2.3-2.3c.22 0 .43.03.63.09v-2.88a5.1 5.1 0 0 0-.63-.04 5.1 5.1 0 0 0-5.1 5.1 5.1 5.1 0 0 0 5.1 5.1 5.1 5.1 0 0 0 5.1-5.1V15.1a7.1 7.1 0 0 0 4.16 1.34v-2.78A4.34 4.34 0 0 1 22.5 10Z" fill="white"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2 — Giới thiệu */}
          <div className="border-t border-slate-200 sm:border-0">
            <LinkGroup title="Giới thiệu" links={aboutLinks} />
          </div>

          {/* Col 3 — Hỗ trợ khách hàng */}
          <div className="border-t border-slate-200 sm:border-0">
            <LinkGroup title="Hỗ trợ khách hàng" links={supportLinks} />
          </div>

          {/* Col 4 — Chính sách chung */}
          <div className="border-t border-slate-200 sm:border-0">
            <LinkGroup title="Chính sách chung" links={policyLinks} />
          </div>

          {/* Col 5 — Chấp nhận thanh toán */}
          <div className="border-t border-slate-200 sm:border-0">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 py-3 lg:py-0">
              Chấp nhận thanh toán
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex h-7 w-12 items-center justify-center rounded border border-slate-200 bg-white">
                <span className="text-sm font-black italic tracking-tight text-[#1A1F71]">VISA</span>
              </span>
              <span className="inline-flex h-7 w-12 items-center justify-center rounded bg-[#AE2070]">
                <span className="text-xs font-black text-white">MoMo</span>
              </span>
              <span className="inline-flex h-7 w-16 items-center justify-center gap-0.5 rounded border border-slate-200 bg-white">
                <span className="text-[11px] font-black text-[#0066CC]">VN</span>
                <span className="text-[11px] font-black text-[#CC0000]">Pay</span>
              </span>
              <span className="inline-flex h-7 w-12 items-center justify-center rounded border border-slate-200 bg-white text-xs font-bold tracking-wider text-emerald-600">
                COD
              </span>
            </div>

            <a
              href="http://online.gov.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block"
              aria-label="Đã thông báo Bộ Công Thương"
            >
              <Image src="/bo-cong-thuong.png" alt="Đã thông báo Bộ Công Thương" width={150} height={56} className="h-auto w-[150px] object-contain" />
            </a>
          </div>

        </div>
      </div>

      {/* ── Copyright bar ── */}
      <div className="border-t border-slate-200 bg-white py-5">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 text-center text-xs text-slate-500 md:flex-row md:text-left">
          <p>© 2026 <strong className="text-slate-700">DUCMANH PC</strong>. All rights reserved.</p>
          <p>Được xây dựng bởi <span className="text-red-500">♥</span> Lưu Đức Mạnh</p>
        </div>
      </div>

    </footer>
  );
}
