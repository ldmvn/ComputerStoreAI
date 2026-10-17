'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Loader2, PackageOpen, XCircle, Truck, Package } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getOrder } from '@/services/order.service';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice } from '@/lib/product';
import type { Order, OrderStatus } from '@/types/order.type';
import { ORDER_STATUS_LABEL } from '@/types/order.type';

const STATUS_CONFIG: Record<OrderStatus, { icon: React.ElementType; color: string; bg: string }> = {
  PENDING:    { icon: Loader2,       color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  CONFIRMED:  { icon: CheckCircle2,  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  SHIPPING:   { icon: Truck,         color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  DELIVERED:  { icon: Package,       color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
  CANCELLED:  { icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50 border-red-200' },
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
};

function OrderDetailContent({ order }: { order: Order }) {
  const cfg = STATUS_CONFIG[order.status];
  const Icon = cfg.icon;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Status banner */}
      <div className={`flex items-center gap-4 rounded-2xl border p-5 ${cfg.bg}`}>
        <Icon className={`h-8 w-8 shrink-0 ${cfg.color} ${order.status === 'PENDING' ? 'animate-spin' : ''}`} />
        <div>
          <p className={`font-semibold ${cfg.color}`}>{ORDER_STATUS_LABEL[order.status]}</p>
          <p className="text-sm text-slate-600">
            Đơn hàng <span className="font-semibold text-slate-800">#{order.id}</span> ·{' '}
            {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Sản phẩm đã đặt</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {order.items.map(item => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                {item.primaryImage ? (
                  <Image src={mediaUrl(item.primaryImage)} alt={item.name} width={56} height={56} className="h-full w-full object-contain" />
                ) : <div className="h-full w-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${item.slug}`} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-primary-600">
                  {item.name}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">{formatProductPrice(item.price)} × {item.quantity}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-primary-700">
                {formatProductPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Tổng tiền hàng</span>
          <span className="text-lg font-bold tabular-nums text-primary-700">{formatProductPrice(order.subtotal)}</span>
        </div>
      </div>

      {/* Shipping + payment */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
          <h3 className="font-semibold text-slate-900">Địa chỉ giao hàng</h3>
          <p className="text-sm font-medium text-slate-800">{order.shippingName}</p>
          <p className="text-sm text-slate-500">{order.shippingPhone}</p>
          <p className="text-sm text-slate-700 leading-relaxed">{order.shippingAddress}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
          <h3 className="font-semibold text-slate-900">Thanh toán</h3>
          <p className="text-sm text-slate-700">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
          {order.note && (
            <>
              <h3 className="pt-2 font-semibold text-slate-900">Ghi chú</h3>
              <p className="text-sm text-slate-600">{order.note}</p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/customer/products" className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700">
          Tiếp tục mua hàng
        </Link>
        <Link href="/customer/profile/orders" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Xem tất cả đơn hàng
        </Link>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const isAuthHydrated = useAuthStore(state => state.isHydrated);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthHydrated) return;
    if (!user) { setError('Vui lòng đăng nhập để xem đơn hàng.'); setLoading(false); return; }
    const id = parseInt(params.id);
    if (!id) { setError('ID đơn hàng không hợp lệ.'); setLoading(false); return; }
    getOrder(id, token)
      .then(setOrder)
      .catch(() => setError('Không tìm thấy đơn hàng hoặc bạn không có quyền xem.'))
      .finally(() => setLoading(false));
  }, [isAuthHydrated, user, token, params.id]);

  return (
    <div className="py-8">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 font-semibold text-red-700">{error}</p>
          <Link href="/customer/cart" className="mt-4 inline-block text-sm text-primary-700 hover:underline">
            Quay lại giỏ hàng
          </Link>
        </div>
      ) : order ? (
        <OrderDetailContent order={order} />
      ) : (
        <div className="mx-auto max-w-lg text-center py-24">
          <PackageOpen className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-slate-500">Không tìm thấy đơn hàng.</p>
        </div>
      )}
    </div>
  );
}
