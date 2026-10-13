'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Trash2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { formatProductPrice } from '@/lib/product';
import { validateBuildPc } from '@/services/buildPc.service';
import { useBuild } from './BuildProvider';
import type { Product } from '@/types/product.type';
import type { ValidateItem } from '@/types/buildPc.type';

function toCartProduct(item: ValidateItem): Product {
  return {
    id: item.productId,
    slug: item.slug,
    sku: item.sku,
    name: item.name,
    price: item.price,
    stockQuantity: item.stockQuantity,
    primaryImage: item.primaryImage,
    isActive: true,
    isDeleted: false,
    category: null,
    categoryId: null,
    brandId: null,
    brand: null,
    brandInfo: null,
    shortDescription: null,
    originalPrice: null,
    lowStockThreshold: 5,
    stockStatus: item.stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    createdAt: '',
    updatedAt: '',
  };
}

export default function BuildSummary() {
  const { slots, items, clearAll, validationStatus, validationResult, validationNetworkError } = useBuild();
  const { addItem, setQuantity } = useCartStore();
  const [cartStatus, setCartStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cartMsg, setCartMsg] = useState('');
  const [infoExpanded, setInfoExpanded] = useState(false);

  const selectedItems = Object.entries(items);

  // Client-side totals and missing (used before server result available)
  const clientTotal = selectedItems.reduce((sum, [, item]) => sum + item.product.price * item.quantity, 0);
  const requiredSlots = slots.filter(s => s.isRequired);
  const clientMissing = requiredSlots.filter(s => !items[s.slug]).map(s => s.name);

  // Server-derived values
  const serverResult  = validationResult;
  const total         = serverResult ? serverResult.total : clientTotal;
  const missing       = serverResult ? serverResult.missing : clientMissing.map(n => ({ slots: [], message: `Còn thiếu: ${n}` }));
  const issues        = serverResult?.issues ?? [];
  const canAddToCart  = serverResult ? serverResult.canAddToCart : clientMissing.length === 0;

  const errorIssues   = issues.filter(i => i.level === 'error');
  const warnIssues    = issues.filter(i => i.level === 'warning');
  const infoIssues    = issues.filter(i => i.level === 'info');

  async function handleAddToCart() {
    if (selectedItems.length === 0) return;
    setCartStatus('loading');

    // Re-validate to get latest prices and stock
    const body = {
      items: selectedItems.map(([slot, item]) => ({ slot, productId: item.product.id, quantity: item.quantity })),
    };

    let freshItems: ValidateItem[];
    try {
      const res = await validateBuildPc(body);
      if (res.data.issues.some(i => i.level === 'error') || res.data.missing.length > 0) {
        setCartMsg('Vẫn còn lỗi tương thích. Vui lòng kiểm tra lại.');
        setCartStatus('error');
        setTimeout(() => setCartStatus('idle'), 5000);
        return;
      }
      freshItems = res.data.items;
    } catch {
      setCartMsg('Không thể xác nhận tương thích. Vui lòng thử lại.');
      setCartStatus('error');
      setTimeout(() => setCartStatus('idle'), 5000);
      return;
    }

    let failed = 0;
    for (const item of freshItems) {
      const prod = toCartProduct(item);
      addItem(prod);
      const ok = setQuantity(item.productId, item.quantity);
      if (!ok) failed++;
    }

    if (failed > 0) {
      setCartMsg(`${failed} sản phẩm không thể thêm vào giỏ (có thể hết hàng).`);
      setCartStatus('error');
    } else {
      setCartStatus('success');
    }
    setTimeout(() => setCartStatus('idle'), 4000);
  }

  // Reason canAddToCart is false (short summary for button)
  const blockReason = !canAddToCart
    ? (errorIssues.length > 0 ? `${errorIssues.length} lỗi tương thích` : missing.length > 0 ? 'Còn thiếu linh kiện' : '')
    : '';

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Tổng kết cấu hình</h2>
        {selectedItems.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
          >
            <Trash2 size={12} />
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Selected items */}
      {selectedItems.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa chọn linh kiện nào.</p>
      ) : (
        <ul className="space-y-2">
          {selectedItems.map(([slug, item]) => {
            const slotName = slots.find(s => s.slug === slug)?.name ?? slug;
            return (
              <li key={slug} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 text-slate-400 shrink-0 w-24 truncate">{slotName}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-700">{item.product.name}</p>
                  <p className="text-[#C4480A] font-medium tabular-nums">
                    {item.quantity > 1 ? `${item.quantity} × ` : ''}
                    {formatProductPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Compatibility check block */}
      {selectedItems.length > 0 && (
        <div className="rounded-md border border-slate-100 p-3 space-y-1.5" aria-live="polite">
          <p className="text-xs font-semibold text-slate-600 mb-1">Kiểm tra tương thích</p>

          {validationNetworkError && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} className="shrink-0" />
              Không kiểm tra được tương thích lúc này
            </p>
          )}

          {validationStatus === 'loading' && !serverResult && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin shrink-0" />
              Đang kiểm tra...
            </p>
          )}

          {serverResult && errorIssues.length === 0 && warnIssues.length === 0 && missing.length === 0 && (
            <p className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle2 size={13} className="shrink-0" />
              Các linh kiện đã chọn tương thích
            </p>
          )}

          {errorIssues.map((issue, idx) => (
            <p key={idx} className="text-xs text-red-600 flex items-start gap-1">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              {issue.message}
            </p>
          ))}

          {warnIssues.map((issue, idx) => (
            <p key={idx} className="text-xs text-amber-600 flex items-start gap-1">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              {issue.message}
            </p>
          ))}

          {infoIssues.length > 0 && (
            <div>
              <button
                onClick={() => setInfoExpanded(v => !v)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
              >
                {infoExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Chưa đủ dữ liệu để kiểm tra {infoIssues.length} mục
              </button>
              {infoExpanded && (
                <ul className="mt-1 space-y-0.5 pl-4">
                  {infoIssues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-slate-400">{issue.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Missing items */}
      {missing.length > 0 && (
        <div className="rounded-md bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-700 mb-1">Thiếu linh kiện:</p>
          <ul className="text-xs text-amber-600 space-y-0.5">
            {missing.map((m, idx) => (
              <li key={idx}>• {m.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Tổng cộng</span>
          <span className="text-lg font-bold text-[#C4480A] tabular-nums">
            {formatProductPrice(total)}
          </span>
        </div>
      </div>

      {/* Cart status feedback */}
      {cartStatus === 'success' && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>Đã thêm vào giỏ hàng!</span>
          <Link href="/customer/cart" className="ml-auto font-medium underline">Xem giỏ</Link>
        </div>
      )}
      {cartStatus === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          <span>{cartMsg}</span>
        </div>
      )}

      {/* Add to cart button */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleAddToCart}
          disabled={selectedItems.length === 0 || !canAddToCart || cartStatus === 'loading'}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C4480A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {cartStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
          Thêm tất cả vào giỏ
        </button>
        {blockReason && (
          <p className="text-center text-xs text-slate-400">{blockReason}</p>
        )}
      </div>
    </aside>
  );
}
