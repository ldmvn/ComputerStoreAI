'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Eye, Heart, PackageOpen, ShoppingCart, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth.store';
import { useAuthModal } from '@/store/authModal.store';
import { useCartStore } from '@/store/cart.store';
import { useToast } from '@/components/ui/Toast';
import { useWishlistStore, type WishlistItem } from '@/store/wishlist.store';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice, productDetailHref } from '@/lib/product';

const STOCK_LABELS: Record<string, { label: string; className: string }> = {
  IN_STOCK: { label: 'Còn hàng', className: 'bg-green-50 text-green-700 ring-green-200' },
  LOW_STOCK: { label: 'Sắp hết hàng', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  OUT_OF_STOCK: { label: 'Hết hàng', className: 'bg-red-50 text-red-700 ring-red-200' },
};

function WishlistSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4" aria-busy="true" aria-label="Đang tải danh sách yêu thích">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-5">
          <div className="h-24 w-24 shrink-0 rounded-lg bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-2/5 rounded bg-slate-100" />
            <div className="h-3 w-1/4 rounded bg-slate-100" />
          </div>
          <div className="hidden h-9 w-36 shrink-0 rounded-lg bg-slate-100 sm:block" />
        </div>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const isHydrated = useAuthStore(state => state.isHydrated);
  const openAuthModal = useAuthModal(state => state.open);
  const items = useWishlistStore(state => state.items);
  const loading = useWishlistStore(state => state.loading);
  const error = useWishlistStore(state => state.error);
  const hydrated = useWishlistStore(state => state.hydrated);
  const hydrate = useWishlistStore(state => state.hydrate);
  const remove = useWishlistStore(state => state.remove);
  const addItem = useCartStore(state => state.addItem);
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (user && !hydrated) void hydrate(token);
    if (!user && isHydrated) useWishlistStore.getState().clear();
  }, [user, token, hydrated, isHydrated, hydrate]);

  const handleRemove = useCallback(async (productId: number, productName: string) => {
    setBusyId(productId);
    try {
      const result = await remove(token, productId);
      if (result.reason === 'auth') {
        toast.info('Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại.');
        openAuthModal();
        return;
      }
      toast.info('Đã xóa khỏi yêu thích', productName);
    } catch (error) {
      toast.error('Không thể xóa khỏi yêu thích', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setBusyId(null);
    }
  }, [token, remove, toast, openAuthModal]);

  const handleAddToCart = useCallback((item: WishlistItem) => {
    if (!addItem(item.product as any, false)) {
      toast.error('Không thể thêm vào giỏ', 'Sản phẩm có thể đã hết hàng hoặc không còn khả dụng.');
      return;
    }
    toast.success('Đã thêm vào giỏ hàng', item.product.name);
  }, [addItem, toast]);

  if (!isHydrated) {
    return <p role="status" className="text-sm text-slate-500">Đang tải...</p>;
  }

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
      <Link href="/" className="hover:text-primary-600">Trang chủ</Link>
      <ChevronRight size={14} aria-hidden="true" />
      <span className="text-slate-700">Yêu thích</span>
    </nav>
  );

  if (!user) {
    return (
      <>
        {breadcrumb}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Yêu thích</h1>
              <p className="text-sm text-slate-500">Lưu lại sản phẩm yêu thích</p>
            </div>
          </div>
          <div className="px-5 pb-6">
            <EmptyState
              icon={Heart}
              iconClassName="mx-auto mb-4 h-11 w-11 text-primary-300"
              title="Vui lòng đăng nhập để xem danh sách sản phẩm yêu thích của bạn."
              description="Sản phẩm yêu thích được lưu theo tài khoản nên bạn có thể xem lại trên mọi thiết bị."
              action={<button type="button" onClick={openAuthModal} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700">Đăng nhập ngay</button>}
            />
          </div>
        </div>
      </>
    );
  }

  const showSkeleton = loading && items.length === 0;

  return (
    <>
      {breadcrumb}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Yêu thích</h1>
              <p className="text-sm text-slate-500" role="status">{items.length} sản phẩm trong danh sách yêu thích</p>
            </div>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
            Tiếp tục khám phá <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Stat strip */}
        {!showSkeleton && items.length > 0 && (
          <div className="grid grid-cols-2 border-y border-slate-200">
            {[
              { label: 'Đã lưu', value: items.length },
              { label: 'Còn hàng', value: items.filter(i => i.product.stockStatus !== 'OUT_OF_STOCK' && i.product.stockQuantity > 0 && i.product.isActive).length },
            ].map((s, idx) => (
              <div key={s.label} className={`px-5 py-4 ${idx < 1 ? 'border-r border-slate-200' : ''}`}>
                <p className="text-2xl font-bold tabular-nums text-primary-600">{s.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {error && <p role="alert" className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="px-4 pb-4">
        {showSkeleton ? <WishlistSkeleton /> : items.length === 0 ? (
      error ? (
        <EmptyState
          icon={PackageOpen}
          title="Không tải được danh sách yêu thích."
          description="Vui lòng tải lại trang hoặc thử lại sau."
          action={<button type="button" onClick={() => void hydrate(token)} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700">Thử lại</button>}
        />
      ) : (
        <EmptyState
          icon={PackageOpen}
          title="Bạn chưa có sản phẩm yêu thích."
          description="Nhấn vào biểu tượng trái tim trên sản phẩm để lưu lại xem sau."
          action={<Link href="/products" className="text-sm font-semibold text-primary-700">Khám phá sản phẩm</Link>}
        />
      )
    ) : (
      <ul className="divide-y divide-slate-100 px-1">
        {items.map(item => {
          const stockInfo = STOCK_LABELS[item.product.stockStatus] || STOCK_LABELS.IN_STOCK;
          const outOfStock = item.product.stockQuantity <= 0 || !item.product.isActive || item.product.stockStatus === 'OUT_OF_STOCK';
          const discounted = !outOfStock && item.product.originalPrice != null && item.product.originalPrice > item.product.price && item.product.price >= 0;
          const discount = discounted ? Math.round((item.product.originalPrice! - item.product.price) / item.product.originalPrice! * 100) : 0;
          const busy = busyId === item.productId;

          return <li key={item.productId} className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 py-5 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
            <Link href={productDetailHref(item.product.slug)} className="flex h-[84px] w-[84px] items-center justify-center rounded-lg bg-slate-50 p-2 sm:h-24 sm:w-24" tabIndex={-1} aria-hidden="true">
              {item.product.primaryImage
                ? <Image src={mediaUrl(item.product.primaryImage)} alt="" width={96} height={96} className="h-full w-full object-contain" />
                : <PackageOpen className="h-8 w-8 text-slate-300" aria-hidden="true" />}
            </Link>

            <div className="min-w-0">
              <Link href={productDetailHref(item.product.slug)} className="line-clamp-2 break-words text-sm font-semibold text-slate-800 hover:text-primary-700 sm:text-base">{item.product.name}</Link>

              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-base font-bold tabular-nums text-primary-700">{formatProductPrice(item.product.price)}</span>
                {discounted && <span className="text-xs tabular-nums text-slate-400 line-through">{formatProductPrice(item.product.originalPrice!)}</span>}
                {discounted && <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-600">-{discount}%</span>}
              </div>

              <div className="mt-1.5">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stockInfo.className}`}>{stockInfo.label}</span>
              </div>

              {item.product.highlightSpecs.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {item.product.highlightSpecs.slice(0, 2).map(spec => <li key={spec.id} className="line-clamp-1">• {spec.content}</li>)}
                </ul>
              )}
            </div>

            {/* Actions: own row on mobile, trailing column from sm up */}
            <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:w-auto">
              <button
                type="button"
                onClick={() => handleAddToCart(item)}
                disabled={outOfStock}
                title={outOfStock ? 'Sản phẩm tạm hết hàng' : 'Thêm vào giỏ'}
                className="ui-button inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />Thêm vào giỏ
              </button>
              <Link
                href={productDetailHref(item.product.slug)}
                aria-label={`Xem chi tiết ${item.product.name}`}
                className="ui-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(item.productId, item.product.name)}
                disabled={busy}
                aria-label={`Xóa ${item.product.name} khỏi yêu thích`}
                className="ui-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>;
        })}
      </ul>
        )}
        </div>
      </div>
    </>
  );
}
