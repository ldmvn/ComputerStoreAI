'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Plus, CheckCircle2, Loader2, ShoppingBag, Home, Briefcase, CreditCard, Banknote } from 'lucide-react';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useAuthModal } from '@/store/authModal.store';
import { useToast } from '@/components/ui/Toast';
import { getAddresses, createAddress } from '@/services/address.service';
import { createOrder } from '@/services/order.service';
import { createVnpayPayment, createMomoPayment } from '@/services/payment.service';
import { validateVoucher, type VoucherValidation } from '@/services/voucher.service';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice } from '@/lib/product';
import type { Address, AddressInput } from '@/types/address.type';
import AddressForm from '@/app/customer/profile/addresses/AddressForm';
import VietQrPopup from './VietQrPopup';
import type { Payment, PaymentAttempt } from '@/types/payment.type';

const PAYMENT_METHODS = [
  { value: 'COD', label: 'Thanh toán khi nhận hàng', short: 'COD', icon: Banknote, description: 'Trả tiền mặt khi nhận hàng' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngân hàng', short: 'Chuyển khoản', icon: CreditCard, description: 'Thông tin tài khoản gửi qua email sau khi đặt hàng' },
  { value: 'VNPAY', label: 'Thanh toán qua VNPAY', short: 'VNPAY', icon: CreditCard, description: 'Thẻ ATM/Visa/Mastercard, QR hoặc ví điện tử qua cổng VNPAY' },
  { value: 'MOMO', label: 'Thanh toán qua MoMo', short: 'MoMo', icon: CreditCard, description: 'Thanh toán bằng thẻ ATM nội địa qua cổng MoMo' },
];

function AddressCard({ addr, selected, onSelect }: { addr: Address; selected: boolean; onSelect: () => void }) {
  const Icon = addr.addressType === 'OFFICE' ? Briefcase : Home;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full px-1 py-2.5 text-left transition hover:opacity-80"
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary-500' : 'border-slate-300'}`}>
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-800">{addr.fullName}</span>
            <span className="flex items-center gap-1 rounded-full border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500">
              <Icon className="h-3 w-3" />{addr.addressType === 'OFFICE' ? 'Văn phòng' : 'Nhà riêng'}
            </span>
            {addr.isDefault && <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700">Mặc định</span>}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{addr.phone}</p>
          <p className="mt-0.5 text-xs text-slate-600">{addr.streetAddress}, {addr.communeName}, {addr.provinceName}</p>
        </div>
      </div>
    </button>
  );
}

export default function CheckoutView() {
  const router = useRouter();
  const session = useCheckoutStore(state => state.session);
  const clearSession = useCheckoutStore(state => state.clear);
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const isAuthHydrated = useAuthStore(state => state.isHydrated);
  const removeItem = useCartStore(state => state.removeItem);
  const openAuthModal = useAuthModal(state => state.open);
  const isModalOpen = useAuthModal(state => state.isOpen);
  const toast = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  // Set after a successful BANK_TRANSFER order — shows the VietQR popup
  // before navigating away, instead of navigating immediately like COD does.
  const [vietQr, setVietQr] = useState<{ orderId: number; payment: Payment; attempt: PaymentAttempt } | null>(null);
  // Tracks whether we already opened the auth modal for this checkout visit,
  // so we can detect "modal closed without login" and redirect back to cart.
  const didOpenModalRef = useRef(false);
  // Set to true the moment order is confirmed — prevents the "empty session"
  // effect below from racing with router.push and sending the user to /cart.
  const orderPlacedRef = useRef(false);

  const [voucherInput, setVoucherInput] = useState('');
  const [voucherApplied, setVoucherApplied] = useState<VoucherValidation | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  const loadAddresses = useCallback(async () => {
    setAddressLoading(true);
    try {
      const list = await getAddresses(token);
      setAddresses(list);
      const def = list.find(a => a.isDefault) ?? list[0];
      if (def) setSelectedAddressId(def.id);
    } catch {
      toast.error('Không thể tải địa chỉ', 'Vui lòng thử lại.');
    } finally {
      setAddressLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddAddress = async (input: AddressInput) => {
    const created = await createAddress(token, input);
    setAddresses(prev => {
      const base = input.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : [...prev];
      return [...base, created].sort((a, b) => +b.isDefault - +a.isDefault);
    });
    setSelectedAddressId(created.id);
    setAddFormOpen(false);
    toast.success('Đã thêm địa chỉ và chọn cho đơn hàng này.');
  };

  useEffect(() => {
    if (!isAuthHydrated) return;
    if (!user) {
      if (!didOpenModalRef.current) {
        didOpenModalRef.current = true;
        openAuthModal();
      } else if (!isModalOpen) {
        // Modal was shown but dismissed without logging in — send back to cart.
        router.replace('/customer/cart');
      }
      return;
    }
    didOpenModalRef.current = false;
    void loadAddresses();
  }, [isAuthHydrated, user, isModalOpen, loadAddresses, openAuthModal, router]);

  useEffect(() => {
    if (!isAuthHydrated) return;
    if (orderPlacedRef.current) return;
    if (!session || session.items.length === 0) {
      router.replace('/customer/cart');
    }
  }, [session, isAuthHydrated, router]);

  // `vietQr` is set AFTER clearSession() for a successful BANK_TRANSFER
  // order — session is legitimately empty at that point, but the component
  // must keep rendering (just the popup, nothing else) instead of falling
  // into the "redirect to cart" loading state and hiding it.
  if ((!session || session.items.length === 0 || !isAuthHydrated) && !vietQr) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (vietQr && (!session || session.items.length === 0)) {
    return (
      <VietQrPopup
        orderId={vietQr.orderId}
        payment={vietQr.payment}
        attempt={vietQr.attempt}
        onClose={() => { router.push(`/customer/profile/orders/${vietQr.orderId}`); setVietQr(null); }}
      />
    );
  }

  if (!session) return null; // unreachable given the guards above — narrows the type for TS below

  const subtotal = session.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = session.items.reduce((sum, item) => sum + item.quantity, 0);
  const discountAmount = voucherApplied?.discountAmount ?? 0;
  const total = subtotal - discountAmount;

  async function handleApplyVoucher() {
    if (!voucherInput.trim()) return;
    setVoucherLoading(true); setVoucherError('');
    try {
      const result = await validateVoucher(token, voucherInput.trim(), subtotal);
      setVoucherApplied(result);
      toast.success(`Áp dụng mã "${result.code}" thành công! Giảm ${formatProductPrice(result.discountAmount)}.`);
    } catch (e) {
      setVoucherError(e instanceof Error ? e.message : 'Mã giảm giá không hợp lệ.');
      setVoucherApplied(null);
    } finally {
      setVoucherLoading(false);
    }
  }

  function handleRemoveVoucher() {
    setVoucherApplied(null);
    setVoucherInput('');
    setVoucherError('');
  }

  const handleSubmit = async () => {
    if (!user) { openAuthModal(); return; }
    if (!selectedAddressId) {
      toast.error('Chưa chọn địa chỉ', 'Vui lòng chọn địa chỉ giao hàng.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        items: session.items.map(i => ({ productId: i.id, quantity: i.quantity })),
        addressId: selectedAddressId,
        paymentMethod,
        note,
        voucherCode: voucherApplied?.code,
      }, token);

      // Mark success BEFORE clearSession so the session-empty effect is suppressed
      orderPlacedRef.current = true;

      if (session.source === 'cart') {
        for (const item of session.items) {
          removeItem(item.id);
        }
      }

      clearSession();

      // BANK_TRANSFER: show the VietQR popup before leaving checkout.
      const attempt = order.payment?.attempts?.[0];
      if (paymentMethod === 'BANK_TRANSFER' && order.payment && attempt) {
        toast.success('Đặt hàng thành công!', `Đơn hàng #${order.id} đã được ghi nhận.`);
        setVietQr({ orderId: order.id, payment: order.payment, attempt });
        return;
      }

      // VNPAY: redirect directly to gateway, no premature "thành công" toast.
      if (paymentMethod === 'VNPAY') {
        try {
          const vnpay = await createVnpayPayment(order.id, token);
          window.location.href = vnpay.data.url;
        } catch {
          toast.error('Không tạo được giao dịch VNPAY', 'Vui lòng thử lại từ trang chi tiết đơn hàng.');
          router.push(`/customer/profile/orders/${order.id}`);
        }
        return;
      }

      // MoMo: same pattern as VNPAY.
      if (paymentMethod === 'MOMO') {
        try {
          const momo = await createMomoPayment(order.id, token, 'atm');
          window.location.href = momo.data.url;
        } catch {
          toast.error('Không tạo được giao dịch MoMo', 'Vui lòng thử lại từ trang chi tiết đơn hàng.');
          router.push(`/customer/profile/orders/${order.id}`);
        }
        return;
      }

      // COD and other sync methods.
      toast.success('Đặt hàng thành công!', `Đơn hàng #${order.id} đã được ghi nhận.`);
      router.push(`/customer/profile/orders/${order.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đặt hàng thất bại. Vui lòng thử lại.';
      toast.error('Đặt hàng thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Đặt hàng</h1>

      {/* Mobile order: address → products → note → right col (price+payment+button) */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">

        {/* ── Left column ── */}
        <div className="min-w-0 space-y-4">

          {/* 1. Address */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MapPin className="h-4 w-4 text-primary-600" />
                Địa chỉ giao hàng
              </h2>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setAddFormOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
                  <Plus className="h-3 w-3" />Thêm địa chỉ
                </button>
                <Link href="/customer/profile/addresses" className="text-xs text-slate-400 hover:underline">
                  Quản lý
                </Link>
              </div>
            </div>
            <div className="space-y-2.5 p-4">
              {addressLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải địa chỉ...
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">Bạn chưa có địa chỉ nào.</p>
                  <button
                    type="button"
                    onClick={() => setAddFormOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />Thêm địa chỉ
                  </button>
                </div>
              ) : (
                addresses.map(addr => (
                  <AddressCard
                    key={addr.id}
                    addr={addr}
                    selected={selectedAddressId === addr.id}
                    onSelect={() => setSelectedAddressId(addr.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* 2. Products */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShoppingBag className="h-4 w-4 text-primary-600" />
                Sản phẩm ({itemCount})
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {session.items.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                    {item.primaryImage ? (
                      <Image
                        src={mediaUrl(item.primaryImage)}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">SL: {item.quantity} × {formatProductPrice(item.price)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-primary-700">
                    {formatProductPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Note */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">Ghi chú đơn hàng</h2>
            </div>
            <div className="p-4">
              <textarea
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Yêu cầu đặc biệt, giờ giao hàng, v.v. (không bắt buộc)"
                maxLength={500}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>

        {/* ── Right column: payment & summary ── */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">

          {/* Voucher */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Mã giảm giá</h2>
            {voucherApplied ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-green-800">{voucherApplied.code}</p>
                  <p className="text-xs text-green-600">Giảm {formatProductPrice(voucherApplied.discountAmount)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                >
                  Xóa
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={e => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                    placeholder="Nhập mã giảm giá"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={voucherLoading || !voucherInput.trim()}
                    className="shrink-0 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {voucherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Áp dụng'}
                  </button>
                </div>
                {voucherError && (
                  <p className="mt-2 text-xs text-red-600">{voucherError}</p>
                )}
              </>
            )}
          </div>

          {/* Price breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Chi tiết thanh toán</h2>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Tạm tính ({itemCount} sản phẩm)</dt>
                <dd className="tabular-nums font-medium text-slate-700">{formatProductPrice(subtotal)}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between gap-2 text-green-700">
                  <dt>Giảm giá ({voucherApplied?.code})</dt>
                  <dd className="tabular-nums font-medium">-{formatProductPrice(discountAmount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <dt>Phí vận chuyển</dt>
                <dd className="text-xs">Tính khi xác nhận</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-2">
                <dt className="font-semibold text-slate-800">Tổng thanh toán</dt>
                <dd className="text-xl font-bold tabular-nums text-primary-700">{formatProductPrice(total)}</dd>
              </div>
            </dl>
          </div>

          {/* Payment method */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Phương thức thanh toán</h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(pm => {
                const Icon = pm.icon;
                const active = paymentMethod === pm.value;
                return (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setPaymentMethod(pm.value)}
                    className="flex w-full items-center gap-3 px-1 py-2 text-left transition hover:opacity-80"
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-primary-500' : 'border-slate-300'}`}>
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />}
                    </span>
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary-600' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{pm.label}</p>
                      <p className="truncate text-xs text-slate-500">{pm.description}</p>
                    </div>
                  </button>
                );
              })}

            </div>
          </div>

          {/* Order button */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedAddressId || addresses.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Đang xử lý...</>
                : `Đặt hàng · ${formatProductPrice(total)}`}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Bằng cách đặt hàng, bạn đồng ý với{' '}
              <Link href="/policy/terms" className="text-primary-600 hover:underline">điều khoản sử dụng</Link>
              {' '}và{' '}
              <Link href="/policy/payment" className="text-primary-600 hover:underline">chính sách thanh toán</Link>.
            </p>

          </div>
        </aside>
      </div>

      {addFormOpen && (
        <AddressForm
          initial={null}
          onSave={handleAddAddress}
          onClose={() => setAddFormOpen(false)}
        />
      )}

      {vietQr && (
        <VietQrPopup
          orderId={vietQr.orderId}
          payment={vietQr.payment}
          attempt={vietQr.attempt}
          onClose={() => { router.push(`/customer/profile/orders/${vietQr.orderId}`); setVietQr(null); }}
        />
      )}
    </section>
  );
}
