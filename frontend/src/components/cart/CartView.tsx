'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import { useCartStore, type CartItem } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAuthModal } from '@/store/authModal.store';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import CartItemsList from './CartItemsList';
import CartSummary from './CartSummary';

function CartSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4" aria-busy="true" aria-label="Đang tải giỏ hàng">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-5">
          <div className="h-[72px] w-[72px] shrink-0 rounded-lg bg-slate-100 sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
          </div>
          <div className="h-9 w-28 shrink-0 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function CartView() {
  const router = useRouter();
  const items = useCartStore(state => state.items);
  const hydrated = useCartStore(state => state.hydrated);
  const hydrate = useCartStore(state => state.hydrate);
  const setQuantity = useCartStore(state => state.setQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const user = useAuthStore(state => state.user);
  const prepare = useCheckoutStore(state => state.prepare);
  const openAuthModal = useAuthModal(state => state.open);
  const isModalOpen = useAuthModal(state => state.isOpen);
  const toast = useToast();

  const deselectedKey = `cart_deselected_${user?.id ?? 'guest'}`;

  // deselectedIds: IDs người dùng đã chủ động bỏ tích — persisted to localStorage per user
  const [deselectedIds, setDeselectedIds] = useState<Set<number>>(new Set<number>());
  // Snapshot of items waiting to be checked out after the user logs in
  const [pendingItems, setPendingItems] = useState<CartItem[] | null>(null);

  const saveDeselected = (next: Set<number>) => {
    try { localStorage.setItem(deselectedKey, JSON.stringify([...next])); } catch {}
    setDeselectedIds(next);
  };

  useEffect(() => { hydrate(user?.id); }, [hydrate, user?.id]);

  // Reset deselectedIds when user changes (load that user's saved deselection)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(deselectedKey);
      setDeselectedIds(raw ? new Set<number>(JSON.parse(raw)) : new Set<number>());
    } catch { setDeselectedIds(new Set<number>()); }
  }, [deselectedKey]);

  // Cleanup deselectedIds khi item bị xóa khỏi giỏ
  useEffect(() => {
    const currentIds = new Set(items.map(i => i.id));
    setDeselectedIds(prev => {
      const next = new Set([...prev].filter(id => currentIds.has(id)));
      if (next.size !== prev.size) {
        try { localStorage.setItem(deselectedKey, JSON.stringify([...next])); } catch {}
        return next;
      }
      return prev;
    });
  }, [items, deselectedKey]);

  // selectedIds = tất cả items TRỪ những cái đã bỏ tích
  const selectedIds = new Set(items.filter(i => !deselectedIds.has(i.id)).map(i => i.id));

  const handleToggle = (id: number) => {
    const next = new Set(deselectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    saveDeselected(next);
  };

  const handleToggleAll = () => {
    const allSelected = items.every(i => !deselectedIds.has(i.id));
    saveDeselected(allSelected ? new Set(items.map(i => i.id)) : new Set());
  };

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = selectedItems.reduce((count, item) => count + item.quantity, 0);

  const handleQuantityChange = (id: number, quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1) return;
    if (!setQuantity(id, quantity)) {
      toast.error('Cập nhật thất bại', 'Số lượng vượt quá tồn kho hoặc không thể lưu giỏ hàng.');
    }
  };

  const handleRemove = (item: CartItem) => {
    if (removeItem(item.id)) toast.success('Đã xóa sản phẩm khỏi giỏ hàng', item.name);
    else toast.error('Có lỗi xảy ra', 'Không thể lưu giỏ hàng.');
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    if (!user) {
      setPendingItems([...selectedItems]);
      openAuthModal();
      return;
    }
    prepare('cart', selectedItems);
    router.push('/customer/checkout');
  };

  // When the auth modal closes, proceed to checkout if the user is now logged in,
  // or clear the pending intent if they dismissed without logging in.
  useEffect(() => {
    if (pendingItems !== null && !isModalOpen) {
      if (user) {
        prepare('cart', pendingItems);
        router.push('/customer/checkout');
      }
      setPendingItems(null);
    }
  }, [isModalOpen, pendingItems, user, prepare, router]);

  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Giỏ hàng</h1>

      {!hydrated ? (
        <CartSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Chưa có sản phẩm trong giỏ hàng."
          description="Thêm sản phẩm bạn muốn mua để tiếp tục."
          action={<Link href="/customer/products" className="text-sm font-semibold text-primary-700">Khám phá sản phẩm</Link>}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <CartItemsList
            items={items}
            selectedIds={selectedIds}
            readOnly={false}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
          />
          <CartSummary total={total} itemCount={itemCount} onCheckout={handleCheckout} />
        </div>
      )}
    </section>
  );
}
