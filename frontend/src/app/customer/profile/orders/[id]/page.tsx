'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Camera, ChevronRight, Clock, PackageCheck, Truck, CheckCircle2,
  XCircle, ShoppingBag, MapPin, CreditCard, Banknote, Package,
  AlertCircle, Loader2, Star, X, QrCode, Wallet, Pencil, Check, Home, Building2, RotateCcw, CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getOrder, cancelOrder, updateOrderAddress, updateOrderPaymentMethod, reorderItems, OrderRequestError } from '@/services/order.service';
import { getVietQrInfo, createVnpayPayment, createMomoPayment, reconcilePayment } from '@/services/payment.service';
import { getAddresses, createAddress } from '@/services/address.service';
import { submitProductReview, updateProductReview, getMyProductReview } from '@/services/productReview.service';
import { useCheckoutStore } from '@/store/checkout.store';
import type { Address, AddressInput } from '@/types/address.type';
import type { ProductReview } from '@/types/product.type';
import AddressForm from '@/app/customer/profile/addresses/AddressForm';
import { ApiRequestError, mediaUrl } from '@/services/http.client';
import VietQrPopup from '@/components/checkout/VietQrPopup';
import type { Order, OrderItem, OrderStatus } from '@/types/order.type';
import { PAYMENT_STATUS_LABEL, type Payment, type PaymentAttempt } from '@/types/payment.type';

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-amber-700 bg-amber-50',
  AWAITING_VERIFICATION: 'text-amber-700 bg-amber-50',
  PROCESSING: 'text-blue-700 bg-blue-50',
  PAID: 'text-green-700 bg-green-50',
  FAILED: 'text-red-700 bg-red-50',
  CANCELLED: 'text-slate-600 bg-slate-100',
  EXPIRED: 'text-slate-600 bg-slate-100',
  REFUNDED: 'text-slate-600 bg-slate-100',
};

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
  const [vietQr, setVietQr] = useState<{ payment: Payment; attempt: PaymentAttempt } | null>(null);
  const [vietQrLoading, setVietQrLoading] = useState(false);
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [momoLoading, setMomoLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const pendingPollsRef = useRef(0);

  // Address change modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Reorder
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderToast, setReorderToast] = useState<{ message: string; skipped: string[] } | null>(null);
  const prepareCheckout = useCheckoutStore(s => s.prepare);

  // Payment method change modal
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [methodSaving, setMethodSaving] = useState(false);
  const [methodError, setMethodError] = useState<string | null>(null);

  // Review state: map productId → existing review (null = not reviewed)
  const [itemReviews, setItemReviews] = useState<Record<number, ProductReview | null>>({});
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // Review modal
  type ReviewModalState = { open: false } | { open: true; item: OrderItem; mode: 'create' | 'edit' };
  const [reviewModal, setReviewModal] = useState<ReviewModalState>({ open: false });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const id = Number(params.id);

  const handleOpenVietQr = async () => {
    setVietQrLoading(true);
    try {
      const res = await getVietQrInfo(id, token);
      setVietQr({ payment: res.data.payment, attempt: res.data.attempt });
    } catch {
      setError('Không tải được thông tin chuyển khoản.');
    } finally {
      setVietQrLoading(false);
    }
  };

  // "Thanh toán lại" — safe to call again while unpaid; each call creates a
  // fresh VNPAY attempt and leaves the SPA for VNPAY's hosted gateway.
  const handleRetryVnpay = async () => {
    setVnpayLoading(true);
    try {
      const res = await createVnpayPayment(id, token);
      window.location.href = res.data.url;
    } catch {
      setError('Không tạo được giao dịch VNPAY. Vui lòng thử lại.');
      setVnpayLoading(false);
    }
  };

  const handleRetryMomo = async () => {
    setMomoLoading(true);
    try {
      const res = await createMomoPayment(id, token, 'atm');
      window.location.href = res.data.url;
    } catch {
      setError('Không tạo được giao dịch MoMo. Vui lòng thử lại.');
      setMomoLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    pendingPollsRef.current = 0;
    setLoading(true); setError(null); setReconciling(false);
    getOrder(id, token)
      .then(async (loaded) => {
        setOrder(loaded);
        const gateway = loaded.paymentMethod === 'VNPAY' || loaded.paymentMethod === 'MOMO';
        const latestAttempt = loaded.payment?.attempts?.[0];
        const paymentPending = loaded.payment && ['PENDING', 'PROCESSING'].includes(loaded.payment.status);
        // Only reconcile if payment is unresolved AND the latest attempt is also unresolved
        const needsReconcile = paymentPending && (!latestAttempt || ['PENDING', 'PROCESSING'].includes(latestAttempt.status));
        if (gateway && needsReconcile) {
          setReconciling(true);
          try {
            await reconcilePayment(id, token);
            const refreshed = await getOrder(id, token);
            setOrder(refreshed);
          } catch { /* keep loaded order; retry buttons remain available */ }
          finally { setReconciling(false); }
        }
      })
      .catch(err => {
        if (err instanceof OrderRequestError && err.status === 404) {
          setError('Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.');
        } else {
          setError('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
        }
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  // Load review status for each item when order is DELIVERED
  useEffect(() => {
    if (!order || order.status !== 'DELIVERED' || reviewsLoaded) return;
    const slugs = order.items.map(i => i.slug).filter(Boolean) as string[];
    if (!slugs.length) { setReviewsLoaded(true); return; }
    Promise.all(
      order.items.filter(i => i.slug).map(async item => {
        try {
          const res = await getMyProductReview(item.slug!, token);
          return { productId: item.productId, review: res.review };
        } catch {
          return { productId: item.productId, review: null };
        }
      })
    ).then(results => {
      const map: Record<number, ProductReview | null> = {};
      for (const r of results) map[r.productId] = r.review;
      setItemReviews(map);
      setReviewsLoaded(true);
    });
  }, [order, token, reviewsLoaded]);

  const openReviewModal = (item: OrderItem, mode: 'create' | 'edit') => {
    const existing = itemReviews[item.productId];
    setReviewRating(existing?.rating ?? 5);
    setReviewContent(existing?.content ?? '');
    setReviewFiles([]);
    setReviewPreviews([]);
    setReviewError(null);
    setReviewSuccess(null);
    setReviewModal({ open: true, item, mode });
  };

  const closeReviewModal = () => {
    reviewPreviews.forEach(u => URL.revokeObjectURL(u));
    setReviewPreviews([]);
    setReviewFiles([]);
    setReviewModal({ open: false });
  };

  const handleReviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).slice(0, 3 - reviewFiles.length);
    if (!list.length) return;
    setReviewFiles(prev => [...prev, ...list].slice(0, 3));
    setReviewPreviews(prev => [...prev, ...list.map(f => URL.createObjectURL(f))].slice(0, 3));
    e.target.value = '';
  };

  const removeReviewFile = (index: number) => {
    URL.revokeObjectURL(reviewPreviews[index]);
    setReviewFiles(prev => prev.filter((_, i) => i !== index));
    setReviewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal.open) return;
    const { item, mode } = reviewModal;
    setReviewError(null);
    if (reviewContent.trim().length < 5) { setReviewError('Nhận xét phải có ít nhất 5 ký tự.'); return; }
    setReviewSubmitting(true);
    try {
      let review: ProductReview;
      if (mode === 'create') {
        const form = new FormData();
        form.append('rating', String(reviewRating));
        form.append('content', reviewContent.trim());
        reviewFiles.forEach(f => form.append('images', f));
        const res = await submitProductReview(token, item.slug!, form);
        review = res.review;
      } else {
        const existing = itemReviews[item.productId];
        if (!existing) { setReviewError('Không tìm thấy đánh giá.'); return; }
        const res = await updateProductReview(token, item.slug!, existing.id, { rating: reviewRating, content: reviewContent.trim() });
        review = res.review;
      }
      setItemReviews(prev => ({ ...prev, [item.productId]: review }));
      closeReviewModal();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : 'Gửi đánh giá thất bại.';
      setReviewError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const MAX_PENDING_POLLS = 8;
  const POLL_INTERVAL_MS = 4000;

  // After initial load, keep polling while the payment is still pending —
  // covers the case where the IPN arrives a few seconds after the user lands.
  useEffect(() => {
    if (!order) return;
    const isGateway = order.paymentMethod === 'VNPAY' || order.paymentMethod === 'MOMO';
    const latestAttempt = order.payment?.attempts?.[0];
    const isPending = order.payment &&
      ['PENDING', 'PROCESSING'].includes(order.payment.status) &&
      (!latestAttempt || ['PENDING', 'PROCESSING'].includes(latestAttempt.status));
    if (!isGateway || !isPending || pendingPollsRef.current >= MAX_PENDING_POLLS) return;

    let cancelled = false;
    setReconciling(true);
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      pendingPollsRef.current += 1;
      try {
        await reconcilePayment(id, token);
        if (cancelled) return;
        const refreshed = await getOrder(id, token);
        if (cancelled) return;
        setOrder(refreshed);
      } catch {
        if (!cancelled) setReconciling(false);
      }
    }, POLL_INTERVAL_MS);

    return () => { cancelled = true; window.clearTimeout(timer); setReconciling(false); };
  }, [order, id, token]);

  const handleCancel = async () => {
    if (!order) return;
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

  const handleReorder = async () => {
    if (!order) return;
    setReorderLoading(true);
    try {
      const result = await reorderItems(token, order.id);
      if (result.available.length === 0) {
        setReorderToast({ message: 'Không có sản phẩm nào có thể mua lại.', skipped: result.unavailable.map(u => `${u.name} (${u.reason})`) });
        return;
      }
      const checkoutItems = result.available.map(e => ({
        id: e.product.id, name: e.product.name, slug: e.product.slug,
        price: e.product.price, primaryImage: e.product.primaryImage,
        stockQuantity: e.product.stockQuantity, quantity: e.addedQuantity,
      }));
      if (result.unavailable.length > 0) {
        setReorderToast({ message: `${result.unavailable.length} sản phẩm không còn khả dụng`, skipped: result.unavailable.map(u => `${u.name} (${u.reason})`) });
        await new Promise(r => setTimeout(r, 1800));
      }
      prepareCheckout('buynow', checkoutItems);
      router.push('/customer/checkout');
    } catch {
      setReorderToast({ message: 'Không thể xử lý. Vui lòng thử lại.', skipped: [] });
    } finally {
      setReorderLoading(false);
    }
  };

  // Address can change while order hasn't been handed to carrier yet.
  const isAddressEditable = order
    ? ['PENDING', 'CONFIRMED'].includes(order.status)
    : false;

  // Payment method / other order edits only while still awaiting payment.
  const isEditable = order
    ? order.status === 'PENDING' &&
      (!order.payment || ['PENDING', 'PROCESSING', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(order.payment.status))
    : false;

  const handleOpenAddressModal = async () => {
    setAddressError(null);
    setSelectedAddressId(null);
    setShowAddressModal(true);
    setAddressLoading(true);
    try {
      const list = await getAddresses(token);
      setAddresses(list);
    } catch {
      setAddressError('Không tải được danh sách địa chỉ.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!selectedAddressId || !order) return;
    setAddressSaving(true); setAddressError(null);
    try {
      const updated = await updateOrderAddress(token, order.id, selectedAddressId);
      setOrder(updated);
      setShowAddressModal(false);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Không thể cập nhật địa chỉ.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleOpenMethodModal = () => {
    setSelectedMethod(order?.paymentMethod ?? '');
    setMethodError(null);
    setShowMethodModal(true);
  };

  const handleSaveMethod = async () => {
    if (!selectedMethod || !order) return;
    setMethodSaving(true); setMethodError(null);
    try {
      const updated = await updateOrderPaymentMethod(token, order.id, selectedMethod);
      setOrder(updated);
      setShowMethodModal(false);
    } catch (err) {
      setMethodError(err instanceof Error ? err.message : 'Không thể cập nhật phương thức.');
    } finally {
      setMethodSaving(false);
    }
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

  const paymentStatus = order.payment?.status;
  const pendingPayment = order.status === 'PENDING' &&
    (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED');
  const meta = pendingPayment
    ? { label: 'Chờ thanh toán', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: CreditCard }
    : STATUS_META[order.status];
  const StatusIcon = meta.icon;
  const timeline = buildTimeline(order);
  const total = order.subtotal - order.discountAmount;
  const paymentIcon = order.paymentMethod === 'COD' ? Banknote : order.paymentMethod === 'MOMO' ? Wallet : CreditCard;
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

          {/* Delivered — review section */}
          {order.status === 'DELIVERED' && (
            <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Star className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Đánh giá sản phẩm
              </h2>
              <p className="mb-3 text-xs text-slate-500">Chia sẻ trải nghiệm của bạn để giúp người dùng khác lựa chọn đúng hơn</p>
              <ul className="space-y-3">
                {order.items.map(item => {
                  const existing = itemReviews[item.productId];
                  const hasReview = existing !== undefined ? existing !== null : false;
                  const ready = reviewsLoaded;
                  return (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                      {/* Product image */}
                      {item.primaryImage ? (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <Image src={mediaUrl(item.primaryImage)} alt="" width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
                          <Package size={16} className="text-slate-400" />
                        </div>
                      )}
                      <span className="line-clamp-1 min-w-0 flex-1 text-sm text-slate-700">{item.name}</span>
                      {/* Action */}
                      {!ready ? (
                        <Loader2 size={14} className="shrink-0 animate-spin text-slate-400" />
                      ) : !item.slug ? null : hasReview ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle size={13} className="shrink-0" />
                            Đã đánh giá
                          </span>
                          <button
                            type="button"
                            onClick={() => openReviewModal(item, 'edit')}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            <Pencil size={11} />
                            Sửa
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openReviewModal(item, 'create')}
                          className="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                        >
                          Viết đánh giá
                        </button>
                      )}
                    </li>
                  );
                })}
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MapPin className="h-4 w-4 text-primary-600" /> Địa chỉ giao hàng
              </h2>
              {isAddressEditable && (
                <button
                  type="button"
                  onClick={handleOpenAddressModal}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 transition hover:bg-primary-50"
                >
                  <Pencil className="h-3 w-3" /> Thay đổi
                </button>
              )}
            </div>
            <p className="text-sm font-medium text-slate-800">{order.shippingName}</p>
            <p className="mt-0.5 text-xs text-slate-500">{order.shippingPhone}</p>
            <p className="mt-0.5 text-xs text-slate-600">{order.shippingAddress}</p>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <PaymentIcon className="h-4 w-4 text-primary-600" /> Thanh toán
              </h2>
              {isEditable && (
                <button
                  type="button"
                  onClick={handleOpenMethodModal}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 transition hover:bg-primary-50"
                >
                  <Pencil className="h-3 w-3" /> Đổi phương thức
                </button>
              )}
            </div>

            {/* Method label */}
            <p className="text-sm font-medium text-slate-700">
              {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng'
                : order.paymentMethod === 'VNPAY' ? 'Cổng thanh toán VNPAY'
                : order.paymentMethod === 'MOMO' ? 'Cổng thanh toán MoMo'
                : 'Chuyển khoản ngân hàng'}
            </p>

            {order.payment ? (
              <>
                {/* Status badge */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLOR[order.payment.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {PAYMENT_STATUS_LABEL[order.payment.status]}
                  </span>
                  {reconciling && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" /> Đang xác minh…
                    </span>
                  )}
                </div>

                {/* VietQR: reopen QR */}
                {order.paymentMethod === 'BANK_TRANSFER' && !['PAID', 'CANCELLED', 'REFUNDED'].includes(order.payment.status) && (
                  <button
                    type="button"
                    onClick={handleOpenVietQr}
                    disabled={vietQrLoading}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50/50 px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {vietQrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Xem mã QR chuyển khoản
                  </button>
                )}

                {/* VNPAY: pay / retry */}
                {order.paymentMethod === 'VNPAY' && order.status !== 'CANCELLED' && !['PAID', 'REFUNDED'].includes(order.payment.status) && (
                  <button
                    type="button"
                    onClick={handleRetryVnpay}
                    disabled={vnpayLoading}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {vnpayLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {['PENDING', 'PROCESSING'].includes(order.payment.status) ? 'Thanh toán ngay' : 'Thanh toán lại'}
                  </button>
                )}

                {/* MoMo: pay / retry */}
                {order.paymentMethod === 'MOMO' && order.status !== 'CANCELLED' && !['PAID', 'REFUNDED'].includes(order.payment.status) && (
                  <button
                    type="button"
                    onClick={handleRetryMomo}
                    disabled={momoLoading}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#a50064] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8c0055] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {momoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {['PENDING', 'PROCESSING'].includes(order.payment.status) ? 'Thanh toán ngay' : 'Thanh toán lại'}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-1.5 text-xs text-slate-400">Chưa có thông tin thanh toán.</p>
            )}
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

          {/* Reorder — CANCELLED orders */}
          {order.status === 'CANCELLED' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <button
                onClick={handleReorder}
                disabled={reorderLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reorderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {reorderLoading ? 'Đang xử lý...' : 'Mua lại'}
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

      {/* ── Reorder toast ── */}
      {reorderToast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-800 px-4 py-3.5 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{reorderToast.message}</p>
              {reorderToast.skipped.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {reorderToast.skipped.map((s, i) => (
                    <li key={i} className="text-xs text-slate-400">• {s}</li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" onClick={() => setReorderToast(null)} className="mt-0.5 shrink-0 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* ── Address change modal ── */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={e => { if (e.target === e.currentTarget) setShowAddressModal(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-800">Chọn địa chỉ giao hàng</h3>
              <button type="button" onClick={() => setShowAddressModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
              {addressLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-500" /></div>
              ) : addresses.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Chưa có địa chỉ nào.</p>
              ) : (
                <ul className="space-y-2">
                  {addresses.map(addr => {
                    const isCurrentShipping =
                      addr.fullName === order.shippingName &&
                      addr.phone === order.shippingPhone;
                    const isSelected = selectedAddressId === addr.id || (selectedAddressId === null && isCurrentShipping);
                    return (
                      <li key={addr.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${isSelected ? 'border-primary-500 bg-primary-50/50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">{addr.fullName} · {addr.phone}</p>
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{addr.streetAddress}, {addr.communeName}, {addr.provinceName}</p>
                              <div className="mt-1 flex items-center gap-2">
                                {addr.addressType === 'HOME' ? <Home className="h-3 w-3 text-slate-400" /> : <Building2 className="h-3 w-3 text-slate-400" />}
                                <span className="text-xs text-slate-400">{addr.addressType === 'HOME' ? 'Nhà riêng' : 'Văn phòng'}</span>
                                {addr.isDefault && <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">Mặc định</span>}
                              </div>
                            </div>
                            {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {addressError && <p className="mt-3 text-sm text-red-600">{addressError}</p>}
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                + Thêm địa chỉ
              </button>
              <button
                type="button"
                onClick={handleSaveAddress}
                disabled={addressSaving || (!selectedAddressId && !addresses.find(a => a.fullName === order.shippingName && a.phone === order.shippingPhone))}
                className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addressSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add address form (renders on top of address modal via DOM order) ── */}
      {showAddForm && (
        <AddressForm
          initial={null}
          onSave={async (input: AddressInput) => {
            const newAddr = await createAddress(token, input);
            setAddresses(prev => [...prev, newAddr]);
            setSelectedAddressId(newAddr.id);
            setShowAddForm(false);
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* ── Payment method change modal ── */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={e => { if (e.target === e.currentTarget) setShowMethodModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-800">Đổi phương thức thanh toán</h3>
              <button type="button" onClick={() => setShowMethodModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4">
              <ul className="space-y-2">
                {[
                  { value: 'MOMO',          label: 'Ví MoMo',                  desc: 'Thanh toán qua cổng MoMo' },
                  { value: 'VNPAY',         label: 'VNPAY',                     desc: 'Thẻ ATM / Visa / QR VNPay' },
                  { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngân hàng',    desc: 'VietQR tự động xác nhận' },
                  { value: 'COD',           label: 'Thanh toán khi nhận hàng',  desc: 'Trả tiền mặt cho shipper' },
                ].map(opt => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(opt.value)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${selectedMethod === opt.value ? 'border-primary-500 bg-primary-50/50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                          <p className="text-xs text-slate-500">{opt.desc}</p>
                        </div>
                        {selectedMethod === opt.value && <Check className="h-4 w-4 shrink-0 text-primary-600" />}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {methodError && <p className="mt-3 text-sm text-red-600">{methodError}</p>}
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setShowMethodModal(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
              <button
                type="button"
                onClick={handleSaveMethod}
                disabled={methodSaving || !selectedMethod || selectedMethod === order.paymentMethod}
                className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {methodSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review modal ── */}
      {reviewModal.open && (() => {
        const item = reviewModal.item;
        const isEdit = reviewModal.mode === 'edit';
        return (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={e => { if (e.target === e.currentTarget) closeReviewModal(); }}>
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-800">{isEdit ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}</h3>
                <button type="button" onClick={closeReviewModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng"><X className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handleReviewSubmit}>
                <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
                  {/* Product info */}
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    {item.primaryImage ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                        <Image src={mediaUrl(item.primaryImage)} alt="" width={48} height={48} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                        <Package size={18} className="text-slate-400" />
                      </div>
                    )}
                    <p className="line-clamp-2 text-sm font-medium text-slate-800">{item.name}</p>
                  </div>

                  {/* Star rating */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-slate-600">Chọn số sao <span className="text-red-500">*</span></p>
                    <div className="inline-flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="rounded p-0.5 transition hover:bg-amber-50"
                          aria-label={`${star} sao`}
                          aria-pressed={star <= reviewRating}
                        >
                          <Star
                            size={28}
                            strokeWidth={1.5}
                            className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Nhận xét <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reviewContent}
                      onChange={e => setReviewContent(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm…"
                      className="block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                    <span className="mt-1 block text-right text-[11px] text-slate-400">{reviewContent.length}/2000</span>
                  </div>

                  {/* Images (create only — editing doesn't re-upload) */}
                  {!isEdit && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-600">Hình ảnh (tùy chọn, tối đa 3 ảnh)</p>
                      <div className="flex flex-wrap gap-2">
                        {reviewPreviews.map((url, i) => (
                          <span key={url} className="relative inline-block h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                            <img src={url} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
                            <button type="button" onClick={() => removeReviewFile(i)} className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-md bg-slate-900/70 text-white" aria-label="Xóa ảnh"><X size={11} /></button>
                          </span>
                        ))}
                        {reviewFiles.length < 3 && (
                          <label className="inline-flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-primary-300 hover:text-primary-500">
                            <Camera size={18} aria-hidden="true" />
                            <span className="mt-1 text-[10px]">Thêm ảnh</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleReviewFileChange} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {reviewError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{reviewError}</p>}
                </div>

                {/* Footer */}
                <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
                  <button type="button" onClick={closeReviewModal} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reviewSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isEdit ? 'Cập nhật' : 'Gửi đánh giá'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {vietQr && (
        <VietQrPopup
          orderId={id}
          payment={vietQr.payment}
          attempt={vietQr.attempt}
          onClose={() => setVietQr(null)}
          onPaid={(payment, attempt) => {
            // Reflect the paid payment immediately, then refetch so the order's
            // own status (auto-approved to CONFIRMED server-side by the SePay
            // webhook) updates without a full page reload.
            setOrder(prev => prev ? { ...prev, payment: { ...payment, attempts: [attempt] } } : prev);
            getOrder(id, token).then(setOrder).catch(() => { /* keep the optimistic patch above */ });
          }}
        />
      )}
    </div>
  );
}
