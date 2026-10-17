'use client';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useToast } from '@/components/ui/Toast';

type Variant = 'compact' | 'full';

type WishlistButtonProps = {
  productId: number;
  productName: string;
  variant?: Variant;
  className?: string;
  onRequireLogin?: () => void;
};

export default function WishlistButton({ productId, productName, variant = 'full', className, onRequireLogin }: WishlistButtonProps) {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const toggle = useWishlistStore(state => state.toggle);
  const ids = useWishlistStore(state => state.ids);
  const pending = useWishlistStore(state => state.pending);
  const hydrate = useWishlistStore(state => state.hydrate);
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (user && !useWishlistStore.getState().hydrated) void hydrate(token); }, [user, token, hydrate]);
  const favorited = ids.has(productId);
  const busy = pending.has(productId);
  const isCompact = variant === 'compact';

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      toast.info('Vui lòng đăng nhập', 'Bạn cần đăng nhập để sử dụng danh sách yêu thích.');
      onRequireLogin?.();
      return;
    }
    try {
      const result = await toggle(token, productId);
      if (result.reason === 'auth') {
        toast.info('Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại.');
        onRequireLogin?.();
        return;
      }
      if (result.favorited) toast.success('Đã thêm vào yêu thích', productName);
      else toast.info('Đã xóa khỏi yêu thích', productName);
    } catch (error) {
      toast.error('Không thể cập nhật yêu thích', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  };

  const baseClass = isCompact
    ? 'ui-button inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 backdrop-blur transition-colors disabled:opacity-50'
    : 'ui-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500';
  const colorClass = favorited
    ? (isCompact ? 'border-primary-300 bg-primary-50 text-primary-600 hover:bg-primary-100' : 'border border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100')
    : (isCompact ? 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary-500' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50');
  const ariaLabel = favorited ? `Bỏ yêu thích ${productName}` : `Yêu thích ${productName}`;

  return <button type="button" onClick={handleClick} disabled={busy} aria-pressed={favorited} aria-label={ariaLabel} title={favorited ? 'Đã yêu thích' : 'Yêu thích'} data-testid="wishlist-button" data-favorited={favorited ? 'true' : 'false'} className={`${baseClass} ${colorClass} ${className || ''}`}>
    <Heart size={isCompact ? 16 : 18} aria-hidden="true" fill={mounted && favorited ? 'currentColor' : 'none'} strokeWidth={2} />
    {!isCompact && <span className="hidden sm:inline">{favorited ? 'Đã yêu thích' : 'Yêu thích'}</span>}
    {!isCompact && <span className="sr-only">{favorited ? 'Đã yêu thích' : 'Yêu thích'}</span>}
  </button>;
}