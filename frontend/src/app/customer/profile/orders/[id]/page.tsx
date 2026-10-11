'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, ChevronRight, Clock, PackageCheck, Truck, CheckCircle2,
  XCircle, ShoppingBag, MapPin, CreditCard, Banknote, Package,
  AlertCircle, Loader2, Star, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getOrder, cancelOrder, OrderRequestError } from '@/services/order.service';
import { mediaUrl } from '@/services/http.client';
import type { Order, OrderStatus } from '@/types/order.type';

function formatPrice(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function formatDatetime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Chờ xác nhận', color: 'text-amber-700 bg-amber-50 border-amber-200',    icon: Clock        },
  CONFIRMED: { label: 'Chờ lấy hàng', color: 'text-blue-700 bg-blue-50 border-blue-200',       icon: PackageCheck },
  SHIPPING:  { label: 'Đang giao',    color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: Truck        },
  DELIVERED: { label: 'Hoàn thành',   color: 'text-green-700 bg-green-50 border-green-200',    icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy',       color: 'text-slate-600 bg-slate-100 border-slate-200',   icon: XCircle      },
};

type TimelineStep = { label: string; time: string | null; done: boolean; icon: React.ElementType };

function buildTimeline(order: Order): TimelineStep[] {
  if (order.status === 'CANCELLED') {
    return [
      { label: 'Đặt hàng',   time: order.createdAt,   done: true,  icon: Package      },
      { label: 'Đã hủy',     time: order.cancelledAt, done: true,  icon: XCircle      },
    ];
  }
  const steps: TimelineStep[] = [
    { label: 'Đặt hàng',       time: order.createdAt,   done: true,                        icon: Package      },
    { label: 'Đã xác nhận',    time: order.confirmedAt, done: order.confirmedAt !== null,  icon: PackageCheck },
    { label: 'Đang vận chuyển', time: order.shippedAt,  done: order.shippedAt !== null,    icon: Truck        },
    { label: 'Đã giao hàng',   time: order.deliveredAt, done: order.deliveredAt !== null,  icon: CheckCircle2 },
  ];
  return steps;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const confirm = useConfirm();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const id = Number(params.id);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true); setError(null);
    getOrder(id, token)
      .then(setOrder)
      .catch(err => {
        if (err instanceof OrderRequestError && err.status === 404) {
          setError('Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.');
        } else {
          setError('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
        }
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleCancel = async () => {
    if (!token || !order) return;
    const ok = await confirm({
      title: 'Hủy đơn hàng',
      description: `Bạn có chắc muốn hủy đơn hàng #${order.id}? Hành động này không thể hoàn tác.`,
      destructive: true,
    });
    if (!ok) return;
    setCancelling(true); setCancelError(null);
    try {
      const { order: updated } = await cancelOrder(token, order.id);
      setOrder(updated);
    } catch (err) {
      setCancelError(err instanceof OrderRequestError ? err.message : 'Không thể hủy đơn hàng.');
    } finally { setCancelling(false); }
  };

  if (!user) return null;

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
      <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
      <ChevronRight size={14} aria-hidden="true" />
      <Link href="/customer/profile" className="hover:text-primary-600">Tài khoản</Link>
      <ChevronRight size={14} aria-hidden="true" />
      <Link href="/customer/profile/orders" className="hover:text-primary-600">Đơn hàng</Link>
      <ChevronRight size={14} aria-hidden="true" />
      <span className="text-slate-700">#{id}</span>
    </nav>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {breadcrumb}
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        {breadcrumb}
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-600">{error ?? 'Không tìm thấy đơn hàng.'}</p>
          <button
            onClick={() => router.push('/customer/profile/orders')}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách đơn hàng
          </button>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[order.status];
  const StatusIcon = meta.icon;
  const timeline = buildTimeline(order);
  const total = order.subtotal - order.discountAmount;
  const paymentIcon = order.paymentMethod === 'COD' ? Banknote : CreditCard;
  const PaymentIcon = paymentIcon;

  return (
    <div className="space-y-4">
      {breadcrumb}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push('/customer/profile/orders')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" /> Đơn hàng của tôi
        </button>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.color}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">

        {/* ── Left ── */}
        <div className="space-y-4">

          {/* Progress timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">Tiến trình đơn hàng</h2>
            <ol className="relative ml-3 border-l border-slate-200">
              {timeline.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <li key={i} className="mb-5 ml-5 last:mb-0">
                    <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      step.done ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-300 bg-white text-slate-400'
                    }`}>
                      <StepIcon className="h-3 w-3" />
                    </span>
                    <p className={`text-sm font-medium ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                    {step.time && (
                      <p className="text-xs text-slate-500">{formatDatetime(step.time)}</p>
                    )}
                  </li>
                );
              })}
            </ol>
            {order.trackingNumber && (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Mã vận đơn: <span className="font-semibold">{order.trackingNumber}</span>
                {order.shippingProvider && ` · ${order.shippingProvider}`}
              </p>
            )}
          </div>

          {/* Products */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShoppingBag className="h-4 w-4 text-primary-600" />
                Sản phẩm ({order.items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {order.items.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {item.primaryImage ? (
                      <Image
                        src={mediaUrl(item.primaryImage)}
                        alt={item.name}
                        fill
                        className="object-contain"
                        sizes="56px"
                      />
                    ) : (
                      <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link href={`/products/${item.slug}`} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-primary-600">
                        {item.name}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-sm font-medium text-slate-800">{item.name}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">{formatPrice(item.price)} × {item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Note */}
          {order.note && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs text-slate-500">Ghi chú: <span className="text-slate-700">{order.note}</span></p>
            </div>
          )}

          {/* Delivered — review CTA + workshop trust signal */}
          {order.status === 'DELIVERED' && (
            <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Star className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Đánh giá sản phẩm
              </h2>
              <p className="mb-3 text-xs text-slate-500">Chia sẻ trải nghiệm của bạn để giúp người dùng khác lựa chọn đúng hơn</p>
              <ul className="space-y-2">
                {order.items.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span className="line-clamp-1 min-w-0 text-sm text-slate-700">{item.name}</span>
                    {item.slug ? (
                      <Link
                        href={`/products/${item.slug}#reviews`}
                        className="shrink-0 rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                      >
                        Viết đánh giá
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-primary-100 pt-3">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">DUCMANH PC</span> bảo hành theo phiếu đi kèm sản phẩm. Cần hỗ trợ kỹ thuật sau mua? Đội ngũ workshop của chúng tôi luôn sẵn sàng.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right ── */}
        <div className="space-y-4">

          {/* Order info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Thông tin đơn hàng</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Mã đơn hàng</dt>
                <dd className="font-semibold text-slate-800">#{order.id}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Ngày đặt</dt>
                <dd className="tabular-nums text-slate-700">{formatDatetime(order.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Cập nhật</dt>
                <dd className="tabular-nums text-slate-700">{formatDatetime(order.updatedAt ?? order.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Shipping */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MapPin className="h-4 w-4 text-primary-600" /> Địa chỉ giao hàng
            </h2>
            <p className="text-sm font-medium text-slate-800">{order.shippingName}</p>
            <p className="mt-0.5 text-xs text-slate-500">{order.shippingPhone}</p>
            <p className="mt-0.5 text-xs text-slate-600">{order.shippingAddress}</p>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <PaymentIcon className="h-4 w-4 text-primary-600" /> Thanh toán
            </h2>
            <p className="text-sm text-slate-700">
              {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {order.paymentMethod === 'COD'
                ? (order.status === 'DELIVERED' ? 'Đã thanh toán' : 'Thanh toán khi nhận hàng')
                : 'Đã thanh toán'}
            </p>
          </div>

          {/* Cancel — PENDING orders only */}
          {order.status === 'PENDING' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              {cancelError && (
                <p className="mb-3 flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {cancelError}
                </p>
              )}
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            </div>
          )}

          {/* Price breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Chi tiết thanh toán</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Tạm tính</dt>
                <dd className="tabular-nums text-slate-700">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between gap-2 text-green-700">
                  <dt>Giảm giá</dt>
                  <dd className="tabular-nums font-medium">-{formatPrice(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                <dt className="font-semibold text-slate-800">Tổng thanh toán</dt>
                <dd className="text-lg font-bold tabular-nums text-primary-700">{formatPrice(total)}</dd>
              </div>
            </dl>
          </div>

        </div>
      </div>
    </div>
  );
}
