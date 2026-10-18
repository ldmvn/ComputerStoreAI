'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Trash2, AlertCircle, CheckCircle2,
  Loader2, Share2, Copy, X,
  Zap, Save, Download, Printer,
} from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { formatProductPrice } from '@/lib/product';
import { getReusableShareCode, revalidateBuildAction } from '@/lib/buildPcActions';
import {
  buildCsv,
  buildPrintHtml,
  getBuildFingerprint,
  type BuildExportItem,
} from '@/lib/buildPcExport';
import { validateBuildPc, saveBuild } from '@/services/buildPc.service';
import { useAuthStore } from '@/store/auth.store';
import { useAuthModal } from '@/store/authModal.store';
import { useBuild } from './BuildProvider';
import type { Product } from '@/types/product.type';
import type { ValidateItem, PickedItem } from '@/types/buildPc.type';

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
  const router = useRouter();
  const {
    slots, items, clearAll, validationResult,
    savedBuild, setSavedBuild,
  } = useBuild();
  const { addItem, setQuantity } = useCartStore();
  const prepareCheckout = useCheckoutStore(state => state.prepare);

  const [cartStatus, setCartStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cartMsg, setCartMsg] = useState('');
  const [cartWarning, setCartWarning] = useState('');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [orderMsg, setOrderMsg] = useState('');
  const orderLockRef = useRef(false);
  /**
   * Snapshot của items Guest ngay lúc bấm "ĐH ngay" trước khi mở Login Modal.
   * Sau khi login thành công, BuildProvider reset items về state của user mới
   * (hoặc trống nếu user mới chưa có bản nháp). Checkout cần dùng đúng snapshot này.
   */
  const guestItemsSnapshotRef = useRef<Record<string, PickedItem> | null>(null);

  const authUser = useAuthStore(state => state.user);
  const authHydrated = useAuthStore(state => state.isHydrated);
  const openAuthModalWithCallback = useAuthModal(state => state.openWithCallback);

  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [savedShareLink, setSavedShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [printError, setPrintError] = useState('');

  const selectedItems = Object.entries(items);
  const currentFingerprint = getBuildFingerprint(
    selectedItems.map(([slot, item]) => ({ slot, productId: item.product.id, quantity: item.quantity })),
  );

  // Client-side total is shown until a matching server validation result arrives.
  const clientTotal = selectedItems.reduce((sum, [, item]) => sum + item.product.price * item.quantity, 0);

  const serverResult = validationResult
    && getBuildFingerprint(validationResult.items) === currentFingerprint
    ? validationResult
    : null;
  const total        = serverResult ? serverResult.total : clientTotal;
  const issues       = serverResult?.issues ?? [];
  const canAddToCart = serverResult ? serverResult.canAddToCart : selectedItems.length > 0;

  const errorIssues = issues.filter(i => i.level === 'error');

  // Display items: use server-validated prices if available
  const displayItems = useMemo<BuildExportItem[]>(() => {
    if (serverResult?.items?.length) {
      return serverResult.items.map(it => ({
        slot: it.slot, productId: it.productId, name: it.name, sku: it.sku,
        quantity: it.quantity, price: it.price, lineTotal: it.lineTotal,
      }));
    }
    return selectedItems.map(([slot, item]) => ({
      slot, productId: item.product.id, name: item.product.name, sku: item.product.sku ?? '',
      quantity: item.quantity, price: item.product.price,
      lineTotal: item.product.price * item.quantity,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverResult, items]);

  const blockReason = !canAddToCart && selectedItems.length > 0
    ? (errorIssues.length > 0 ? `${errorIssues.length} lỗi tương thích / hết hàng` : '')
    : '';

  // ── Add to cart ──────────────────────────────────────────────────────────────

  async function revalidateBuild(allowFailOpen: boolean): Promise<
    | { ok: true; items: ValidateItem[]; networkFail: boolean }
    | { ok: false; message: string }
  > {
    const body = {
      items: selectedItems.map(([slot, item]) => ({ slot, productId: item.product.id, quantity: item.quantity })),
    };
    const fallbackItems: ValidateItem[] = selectedItems.map(([slot, item]) => ({
      slot, productId: item.product.id,
      slug: item.product.slug ?? '', sku: item.product.sku ?? '',
      name: item.product.name, price: item.product.price,
      quantity: item.quantity, lineTotal: item.product.price * item.quantity,
      stockQuantity: item.product.stockQuantity ?? item.quantity,
      primaryImage: item.product.primaryImage ?? null,
    }));
    return revalidateBuildAction({ validate: validateBuildPc, body, fallbackItems, allowFailOpen });
  }

  async function handleAddToCart() {
    if (selectedItems.length === 0 || !canAddToCart || cartStatus === 'loading') return;
    setCartStatus('loading');
    setCartMsg('');
    setCartWarning('');

    const result = await revalidateBuild(true);
    if (!result.ok) {
      setCartMsg(result.message);
      setCartStatus('error');
      setTimeout(() => setCartStatus('idle'), 5000);
      return;
    }
    const { items: freshItems, networkFail } = result;

    let failed = 0;
    for (const item of freshItems) {
      addItem(toCartProduct(item));
      if (!setQuantity(item.productId, item.quantity)) failed++;
    }

    if (networkFail) {
      setCartWarning('Không kiểm tra được tương thích lúc này. Giá và tồn kho sẽ được kiểm tra lại khi đặt hàng.');
    }

    if (failed > 0) {
      setCartMsg(`${failed} sản phẩm không thể thêm vào giỏ (có thể hết hàng).`);
      setCartStatus('error');
    } else {
      setCartStatus('success');
    }
    setTimeout(() => setCartStatus('idle'), 4000);
  }

  // ── Order now ────────────────────────────────────────────────────────────────

  /**
   * Logic checkout thực tế — nhận `sourceItems` là snapshot hoặc items trực tiếp.
   * Tách ra để callback sau Login có thể gọi lại với snapshot Guest đã lưu.
   */
  async function executeOrderNow(sourceItems: [string, PickedItem][]) {
    if (sourceItems.length === 0 || orderLockRef.current) return;
    orderLockRef.current = true;
    setOrderStatus('loading');
    setOrderMsg('');

    const body = {
      items: sourceItems.map(([slot, item]) => ({ slot, productId: item.product.id, quantity: item.quantity })),
    };
    const fallbackItems: ValidateItem[] = sourceItems.map(([slot, item]) => ({
      slot, productId: item.product.id,
      slug: item.product.slug ?? '', sku: item.product.sku ?? '',
      name: item.product.name, price: item.product.price,
      quantity: item.quantity, lineTotal: item.product.price * item.quantity,
      stockQuantity: item.product.stockQuantity ?? item.quantity,
      primaryImage: item.product.primaryImage ?? null,
    }));

    const result = await revalidateBuildAction({ validate: validateBuildPc, body, fallbackItems, allowFailOpen: false });
    if (!result.ok) {
      orderLockRef.current = false;
      setOrderMsg(result.message);
      setOrderStatus('error');
      setTimeout(() => setOrderStatus('idle'), 5000);
      return;
    }
    const { items: freshItems } = result;

    prepareCheckout('buynow', freshItems.map(item => ({
      id: item.productId,
      slug: item.slug,
      name: item.name,
      price: item.price,
      primaryImage: item.primaryImage,
      stockQuantity: item.stockQuantity,
      quantity: item.quantity,
    })));
    router.push('/customer/checkout');
  }

  async function handleOrderNow() {
    if (selectedItems.length === 0 || !canAddToCart) return;
    if (!authHydrated) return; // chờ auth settle

    // Guest: snapshot items rồi mở Login Modal với callback one-shot
    if (!authUser) {
      guestItemsSnapshotRef.current = { ...items };
      openAuthModalWithCallback(() => {
        // Sau khi login, BuildProvider đã reset sang state của user mới.
        // Phải dùng snapshot Guest đã lưu trước — không dùng `selectedItems` lúc này.
        const snapshot = guestItemsSnapshotRef.current;
        guestItemsSnapshotRef.current = null;
        if (!snapshot) return;
        void executeOrderNow(Object.entries(snapshot));
      });
      return;
    }

    // Đã đăng nhập: tiếp tục checkout trực tiếp
    void executeOrderNow(selectedItems);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function ensureSaved(): Promise<string | null> {
    const reusableShareCode = getReusableShareCode(currentFingerprint, savedBuild);
    if (reusableShareCode) {
      const existingLink = `${window.location.origin}/customer/build-pc/manual?code=${encodeURIComponent(reusableShareCode)}`;
      setSavedShareLink(existingLink);
      return existingLink;
    }

    setSaveStatus('loading');
    setSaveMsg('');
    try {
      const body = {
        items: selectedItems.map(([slot, item]) => ({ slot, productId: item.product.id, quantity: item.quantity })),
      };
      const res = await saveBuild(body);
      const link = `${window.location.origin}${res.data.path}`;
      setSavedBuild({ fingerprint: currentFingerprint, shareCode: res.data.shareCode });
      setSavedShareLink(link);
      return link;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setSaveMsg(
        msg.includes('429') || msg.includes('quá nhiều')
          ? 'Bạn đã tạo quá nhiều cấu hình. Vui lòng thử lại sau 1 giờ.'
          : msg || 'Không thể lưu cấu hình.'
      );
      setSaveStatus('error');
      return null;
    }
  }

  async function handleSave() {
    if (selectedItems.length === 0 || saveStatus === 'loading') return;
    const link = await ensureSaved();
    if (link) setSaveStatus('done');
  }

  async function handleCopy() {
    if (!savedShareLink) return;
    try {
      await navigator.clipboard.writeText(savedShareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.getElementById('share-link-input') as HTMLInputElement | null;
      if (el) { el.select(); document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    }
  }

  // ── Share ────────────────────────────────────────────────────────────────────

  async function handleShare() {
    if (selectedItems.length === 0 || saveStatus === 'loading') return;
    const link = await ensureSaved();
    if (!link) return;
    setSaveStatus('idle'); // don't show save panel; just share

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Cấu hình PC - DUCMANH PC', url: link });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(link);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setShareNotice('Đã sao chép link!');
      setTimeout(() => setShareNotice(''), 2500);
    }
  }

  // ── Download CSV ─────────────────────────────────────────────────────────────

  function handleDownloadCsv() {
    if (displayItems.length === 0) return;
    const slotNameMap = new Map(slots.map(s => [s.slug, s.name]));
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `cau-hinh-pc-${dateStr}.csv`;
    const blob = new Blob([buildCsv(displayItems, slotNameMap)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Print ────────────────────────────────────────────────────────────────────

  function handlePrint() {
    if (displayItems.length === 0) return;
    setPrintError('');
    const slotNameMap = new Map(slots.map(s => [s.slug, s.name]));
    const dateStr = new Date().toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) {
      setPrintError('Trình duyệt đang chặn cửa sổ in. Hãy cho phép cửa sổ bật lên cho trang này rồi thử lại.');
      return;
    }
    win.document.write(buildPrintHtml({
      items: displayItems,
      slotNames: slotNameMap,
      storeName: 'DUCMANH PC',
      printedAt: dateStr,
      note: 'Giá và tồn kho có thể thay đổi theo thời điểm.',
    }));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const noItems = selectedItems.length === 0;
  const busySave = saveStatus === 'loading';

  const secondaryBtnClass =
    'ui-button ui-button--neutral flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-white px-2.5 text-xs font-medium text-primary-700 hover:border-primary-300 hover:bg-primary-50 active:bg-primary-100 disabled:cursor-not-allowed disabled:border-primary-100 disabled:bg-primary-50 disabled:text-primary-300';

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Tổng kết cấu hình</h2>
        {!noItems && (
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
      {noItems ? (
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

      {/* Total */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Tổng cộng</span>
          <span className="text-lg font-bold text-[#C4480A] tabular-nums">
            {formatProductPrice(total)}
          </span>
        </div>
      </div>

      {/* Primary buttons: Add to cart + Order now */}
      {!noItems && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
        <button
          onClick={handleAddToCart}
          disabled={noItems || !canAddToCart || cartStatus === 'loading'}
          className="ui-button ui-button--primary flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:bg-primary-200 disabled:text-white/80"
        >
          {cartStatus === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
          {cartStatus === 'loading' ? 'Đang xử lý...' : 'Thêm vào giỏ hàng'}
        </button>
        <button
          onClick={handleOrderNow}
          disabled={noItems || !canAddToCart || orderStatus === 'loading'}
          className="ui-button ui-button--neutral flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary-300 bg-white px-4 text-sm font-semibold text-primary-700 hover:border-primary-400 hover:bg-primary-50 active:bg-primary-100 disabled:cursor-not-allowed disabled:border-primary-100 disabled:bg-primary-50 disabled:text-primary-300"
        >
          {orderStatus === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          Đặt hàng ngay
        </button>
      </div>}

      {blockReason && (
        <p className="text-center text-xs text-slate-400 -mt-2">{blockReason}</p>
      )}

      {/* Secondary buttons */}
      {!noItems && <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleSave}
          disabled={noItems || busySave}
          className={secondaryBtnClass}
        >
          {saveStatus === 'loading' && !shareNotice ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Lưu cấu hình
        </button>
        <button
          onClick={handleShare}
          disabled={noItems || busySave}
          className={secondaryBtnClass}
        >
          <Share2 size={13} />
          Chia sẻ
        </button>
        <button
          onClick={handleDownloadCsv}
          disabled={noItems}
          className={secondaryBtnClass}
        >
          <Download size={13} />
          Tải Excel
        </button>
        <button
          onClick={handlePrint}
          disabled={noItems}
          className={secondaryBtnClass}
        >
          <Printer size={13} />
          Xem &amp; In
        </button>
      </div>}

      {/* Share notice (copy-to-clipboard feedback) */}
      {shareNotice && (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircle2 size={12} className="shrink-0" />
          {shareNotice}
        </p>
      )}

      {/* Save panel */}
      {saveStatus === 'done' && savedShareLink && (
        <div className="relative rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
          <button
            onClick={() => setSaveStatus('idle')}
            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
          <p className="text-xs font-medium text-blue-800">Đã lưu cấu hình. Ai có link đều xem được.</p>
          <div className="flex items-center gap-1.5">
            <input
              id="share-link-input"
              readOnly
              value={savedShareLink}
              className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="ui-button ui-button--neutral flex h-8 shrink-0 items-center gap-1 rounded-lg border border-primary-200 bg-white px-2.5 text-xs font-medium text-primary-700 hover:border-primary-300 hover:bg-primary-50 active:bg-primary-100"
            >
              <Copy size={12} />
              {copied ? 'Đã sao chép' : 'Sao chép link'}
            </button>
          </div>
        </div>
      )}

      {/* Error panels */}
      {cartStatus === 'success' && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>Đã thêm vào giỏ hàng!</span>
          <Link href="/customer/cart" className="ml-auto font-medium underline">Xem giỏ</Link>
        </div>
      )}
      {cartWarning && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{cartWarning}</span>
        </div>
      )}
      {cartStatus === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          <span>{cartMsg}</span>
        </div>
      )}
      {orderStatus === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          <span>{orderMsg}</span>
        </div>
      )}
      {saveStatus === 'error' && saveMsg && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}
      {printError && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{printError}</span>
        </div>
      )}
    </aside>
  );
}
