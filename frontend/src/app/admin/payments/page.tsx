'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Quản lý thanh toán đã được hợp nhất vào /admin/orders — trang này chỉ còn
// tồn tại để chuyển hướng các bookmark/link cũ, không còn giao diện riêng.
export default function AdminPaymentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/orders'); }, [router]);
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
    </div>
  );
}
