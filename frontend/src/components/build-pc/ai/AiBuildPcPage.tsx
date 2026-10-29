'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Loader2, AlertCircle, CheckCircle2, AlertTriangle,
  ShoppingCart, Pencil, ChevronDown, ChevronUp, Send, Wrench,
  Cpu, Monitor, Zap, Shield, Package, BarChart3,
  MessageSquare, Search, GitCompare,
} from 'lucide-react';
import { useAiBuildPc, clearAiBuildPcStorage } from '@/hooks/useAiBuildPc';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { validateBuildPc } from '@/services/buildPc.service';
import { formatProductPrice } from '@/lib/product';
import type {
  AiBuildPcRequest, AiBuildPcResult, AiBuildPcTier, AiBuildPcItem,
  FpsEstimate, ParsedRequirements,
} from '@/types/aiBuildPc.type';
import {
  QUICK_SUGGESTIONS, PURPOSE_SHORTCUTS, PURPOSE_PROMPTS,
  SLOT_LABELS, REFINEMENT_PRESETS,
} from '@/types/aiBuildPc.type';
import type { Product } from '@/types/product.type';
import type { PickedItem, BuildPcProduct } from '@/types/buildPc.type';

function toCartProduct(item: AiBuildPcItem): Product {
  return {
    id: item.productId, slug: item.slug, sku: item.sku, name: item.name,
    price: item.price, stockQuantity: item.stockQuantity ?? 0,
    primaryImage: item.primaryImage, isActive: true, isDeleted: false,
    category: null, categoryId: null, brandId: null, brand: null, brandInfo: null,
    shortDescription: null, originalPrice: null, lowStockThreshold: 5,
    stockStatus: (item.stockQuantity ?? 0) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    createdAt: '', updatedAt: '',
  };
}

function formatBudgetDiff(diff: number): string {
  const abs = Math.abs(diff);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1).replace('.0', '')} triệu`;
  if (abs >= 1000) return `${Math.round(abs / 1000)} nghìn`;
  return formatProductPrice(abs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AiBuildPcPage() {
  const router = useRouter();
  const { state, result, lastPrompt, errorMsg, generate, reset, cancel } = useAiBuildPc();
  const userId = useAuthStore(s => s.user?.id ?? null);
  const { addItem, setQuantity } = useCartStore();
  const [cartStatus, setCartStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cartMsg, setCartMsg] = useState('');

  function handleSubmit(prompt: string) {
    generate({ prompt });
  }

  function handleRefine(modification: string) {
    const newPrompt = lastPrompt
      ? `${lastPrompt}. Chỉnh lại: ${modification}`
      : modification;
    generate({ prompt: newPrompt });
  }

  function handleTransferToManual(tier: AiBuildPcTier) {
    if (!tier.items.length) return;
    const buildItems: Record<string, PickedItem> = {};
    for (const item of tier.items) {
      const product: BuildPcProduct = {
        id: item.productId, slug: item.slug, sku: item.sku, name: item.name,
        price: item.price, stockQuantity: item.stockQuantity ?? 0,
        inStock: (item.stockQuantity ?? 0) > 0, primaryImage: item.primaryImage,
        brand: null, warranty: null,
      };
      buildItems[item.slot] = { product, quantity: item.quantity };
    }
    try {
      const key = userId ? `build-pc:user:${userId}` : 'build-pc:guest';
      localStorage.setItem(key, JSON.stringify(buildItems));
    } catch { /* ignore */ }
    router.push('/customer/build-pc/manual');
  }

  async function handleAddToCart(tier: AiBuildPcTier) {
    if (!tier.items.length || cartStatus === 'loading') return;
    setCartStatus('loading');
    setCartMsg('');
    try {
      const body = { items: tier.items.map(it => ({ slot: it.slot, productId: it.productId, quantity: it.quantity })) };
      const validated = await validateBuildPc(body);
      if (!validated.data.canAddToCart) {
        const errors = validated.data.issues.filter((i: { level: string }) => i.level === 'error');
        setCartMsg(errors.length ? errors.map((e: { message: string }) => e.message).join('; ') : 'Cấu hình có lỗi.');
        setCartStatus('error');
        setTimeout(() => setCartStatus('idle'), 5000);
        return;
      }
      let failed = 0;
      for (const item of tier.items) {
        addItem(toCartProduct(item));
        if (!setQuantity(item.productId, item.quantity)) failed++;
      }
      setCartStatus(failed > 0 ? 'error' : 'success');
      if (failed > 0) setCartMsg(`${failed} sản phẩm không thể thêm.`);
      setTimeout(() => setCartStatus('idle'), 4000);
    } catch {
      setCartMsg('Không thể kiểm tra cấu hình.');
      setCartStatus('error');
      setTimeout(() => setCartStatus('idle'), 5000);
    }
  }

  if (state === 'loading') return <LoadingView onCancel={cancel} />;

  if (state === 'done' && result?.tiers?.length) {
    return (
      <ResultView
        result={result}
        lastPrompt={lastPrompt}
        onEdit={reset}
        onRefine={handleRefine}
        onTransfer={handleTransferToManual}
        onAddToCart={handleAddToCart}
        cartStatus={cartStatus}
        cartMsg={cartMsg}
      />
    );
  }

  return (
    <InputView
      onSubmit={handleSubmit}
      errorMsg={state === 'error' ? errorMsg : ''}
      lastPrompt={lastPrompt}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function InputView({ onSubmit, errorMsg, lastPrompt }: {
  onSubmit: (prompt: string) => void;
  errorMsg: string;
  lastPrompt: string;
}) {
  const [prompt, setPrompt] = useState(lastPrompt);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(prompt.trim());
  }

  function handleQuickSuggestion(text: string) {
    setPrompt(text);
    onSubmit(text);
  }

  function handlePurposeClick(value: string) {
    const defaultPrompt = PURPOSE_PROMPTS[value] || `Máy ${value}, tầm 20 triệu`;
    setPrompt(defaultPrompt);
  }

  return (
    <div className="min-h-[80vh] bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C4480A]">
            DUCMANH PC BUILDER
          </p>
          <h1 className="text-2xl font-bold leading-tight sm:text-4xl lg:text-[2.5rem]">
            AI Build PC: cấu hình theo nhu cầu và
            <br className="hidden sm:block" /> ngân sách, không cần rành phần cứng
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Lựa chọn từ các linh kiện đang kinh doanh tại DUCMANH PC
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-600" />
              Kiểm tra khả năng tương thích giữa các linh kiện
            </span>
            <span className="flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-blue-500" />
              DUCMANH PC lắp ráp và bảo hành
            </span>
          </div>
        </div>

        {/* Main input area */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-[#C4480A]/40 bg-gray-50 p-4 sm:flex-row sm:items-end sm:gap-4 sm:p-5">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="VD: máy chơi Valorant và Liên Minh, màn 2K, tầm 25 triệu"
              rows={3}
              className="flex-1 resize-none rounded-lg bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none sm:text-lg"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#C4480A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a83b08] disabled:opacity-40 disabled:cursor-not-allowed sm:self-stretch"
            >
              Nhờ AI dựng
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Error */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick suggestions */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Thử nhanh</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((text, i) => (
              <button
                key={i}
                onClick={() => handleQuickSuggestion(text)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900 shadow-sm"
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {/* Purpose shortcuts */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Hoặc chọn nhanh nhu cầu</p>
          <div className="flex flex-wrap gap-2">
            {PURPOSE_SHORTCUTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handlePurposeClick(opt.value)}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900 shadow-sm"
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
            <Link
              href="/customer/build-pc/manual"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900 shadow-sm"
            >
              <Wrench className="h-4 w-4" />
              Tự chọn linh kiện
            </Link>
          </div>
        </div>

        {/* Support bar */}
        <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            <span className="mr-2 text-lg">📞</span>
            Cần hỗ trợ thêm? Liên hệ DUCMANH PC qua{' '}
            <strong className="text-gray-900">Zalo</strong> hoặc gọi{' '}
            <strong className="text-gray-900">Hotline 0123 456 789</strong> để được tư vấn trực tiếp.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">AI LÀM VIỆC THẾ NÀO</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C4480A] text-sm font-bold text-white">1</span>
                <div className="flex items-center gap-1.5 text-base font-bold">
                  <MessageSquare className="h-4 w-4 text-[#C4480A]" />
                  Chia sẻ nhu cầu và ngân sách
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Mô tả mục đích sử dụng và mức ngân sách dự kiến. AI sẽ phân tích thông tin và hỏi thêm nếu cần để đưa ra tư vấn phù hợp.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C4480A] text-sm font-bold text-white">2</span>
                <div className="flex items-center gap-1.5 text-base font-bold">
                  <Search className="h-4 w-4 text-[#C4480A]" />
                  AI lựa chọn linh kiện
                </div>
              </div>
              <p className="text-sm text-gray-500">
                AI lựa chọn linh kiện từ danh mục sản phẩm đang kinh doanh tại DUCMANH PC, dựa trên nhu cầu, giá bán và khả năng tương thích.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C4480A] text-sm font-bold text-white">3</span>
                <div className="flex items-center gap-1.5 text-base font-bold">
                  <GitCompare className="h-4 w-4 text-[#C4480A]" />
                  So sánh và lựa chọn cấu hình
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Tham khảo ba phương án: Tiết kiệm, Cân bằng và Hiệu năng cao. Mỗi phương án được xây dựng để đáp ứng nhu cầu sử dụng trong phạm vi ngân sách đã cung cấp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingView({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="min-h-[80vh] bg-white text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C4480A]/10 border border-[#C4480A]/20">
          <Loader2 className="h-8 w-8 animate-spin text-[#C4480A]" />
        </div>
        <h2 className="text-xl font-bold">Đang tạo cấu hình...</h2>
        <p className="mt-2 text-sm text-gray-500">AI đang tìm kiếm linh kiện, kiểm tra tương thích và tối ưu 3 bản cấu hình. Quá trình này có thể mất 30–90 giây.</p>
        <div className="mt-8 space-y-3">
          {['Phân tích nhu cầu sử dụng', 'Tìm kiếm linh kiện phù hợp', 'Kiểm tra tương thích', 'Dựng 3 bản cấu hình', 'Ước tính hiệu năng'].map((step, i) => (
            <div key={i} className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C4480A]" style={{ animationDelay: `${i * 300}ms` }} />
              {step}
            </div>
          ))}
        </div>
        <button onClick={onCancel} className="mt-10 text-sm text-gray-400 hover:text-gray-600 transition">Hủy</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function ResultView({ result, lastPrompt, onEdit, onRefine, onTransfer, onAddToCart, cartStatus, cartMsg }: {
  result: AiBuildPcResult;
  lastPrompt: string;
  onEdit: () => void;
  onRefine: (mod: string) => void;
  onTransfer: (tier: AiBuildPcTier) => void;
  onAddToCart: (tier: AiBuildPcTier) => void;
  cartStatus: string;
  cartMsg: string;
}) {
  const [selectedIdx, setSelectedIdx] = useState(result.selectedTier);
  const tier = result.tiers[selectedIdx] || result.tiers[0];
  const parsed = result.parsedRequirements || {};

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-[#C4480A]" />
            <h1 className="text-xl font-bold sm:text-2xl">
              AI DỰNG {result.tiers.length} CẤU HÌNH CHO BẠN
            </h1>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 transition hover:border-gray-400 hover:text-gray-900"
          >
            <Pencil className="h-3.5 w-3.5" />
            Sửa yêu cầu
          </button>
        </div>

        {/* Original prompt quote */}
        {lastPrompt && (
          <div className="mb-4">
            <p className="text-base text-gray-600">
              <span className="mr-2 text-xl text-gray-300">&ldquo;</span>
              {lastPrompt}
              <span className="ml-1 text-xl text-gray-300">&rdquo;</span>
            </p>
          </div>
        )}

        {/* Parsed requirements tags */}
        <ParsedRequirementsTags parsed={parsed} />

        {/* Tier cards */}
        <div className="mt-6 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {result.tiers.map((t, i) => (
            <TierCard
              key={i}
              tier={t}
              budget={result.budget}
              selected={i === selectedIdx}
              recommended={i === result.selectedTier}
              onClick={() => setSelectedIdx(i)}
              prevTier={i > 0 ? result.tiers[i - 1] : undefined}
            />
          ))}
        </div>

        <p className="mb-8 text-xs text-gray-400">
          Mặc định AI không đưa ra bản vượt ngân sách bạn nêu.
        </p>

        {/* Selected tier detail */}
        <TierDetail
          tier={tier}
          tierIdx={selectedIdx}
          result={result}
          onTransfer={() => onTransfer(tier)}
          onAddToCart={() => onAddToCart(tier)}
          cartStatus={cartStatus}
          cartMsg={cartMsg}
        />

        {/* Refinement section */}
        <RefinementSection onRefine={onRefine} />

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/customer/build-pc" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← Quay lại
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSED REQUIREMENTS TAGS
// ═══════════════════════════════════════════════════════════════════════════════

function ParsedRequirementsTags({ parsed }: { parsed: ParsedRequirements }) {
  const tags: { label: string; value: string }[] = [];
  if (parsed.purpose) tags.push({ label: 'NHU CẦU', value: parsed.purpose });
  if (parsed.games?.length) tags.push({ label: 'GAME', value: parsed.games.join(', ') });
  if (parsed.monitor) tags.push({ label: 'MÀN HÌNH', value: parsed.monitor });
  if (parsed.fps) tags.push({ label: 'FPS', value: `${parsed.fps} FPS` });
  if (parsed.budget) tags.push({ label: 'NGÂN SÁCH', value: `Tối đa ${(parsed.budget / 1_000_000).toFixed(0)} triệu` });
  if (parsed.preferences?.length) tags.push({ label: 'SỞ THÍCH', value: parsed.preferences.join(', ') });

  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs">
          <span className="font-bold text-gray-400">{tag.label}</span>
          <span className="text-gray-700">{tag.value}</span>
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER CARD
// ═══════════════════════════════════════════════════════════════════════════════

function TierCard({ tier, budget, selected, recommended, onClick, prevTier }: {
  tier: AiBuildPcTier;
  budget: number;
  selected: boolean;
  recommended: boolean;
  onClick: () => void;
  prevTier?: AiBuildPcTier;
}) {
  const diff = tier.totalPrice - budget;
  const diffLabel = diff <= 0
    ? `Dư ${formatBudgetDiff(Math.abs(diff))} so với ngân sách`
    : `Vượt ${formatBudgetDiff(diff)} so với ngân sách`;

  const diffItems = useMemo(() => {
    if (!prevTier) return '';
    const priceDiff = tier.totalPrice - prevTier.totalPrice;
    const changedSlots: string[] = [];
    for (const item of tier.items) {
      const prevItem = prevTier.items.find(p => p.slot === item.slot);
      if (!prevItem || prevItem.productId !== item.productId) {
        changedSlots.push(SLOT_LABELS[item.slot] || item.slot);
      }
    }
    for (const pi of prevTier.items) {
      if (!tier.items.find(t => t.slot === pi.slot)) {
        changedSlots.push(SLOT_LABELS[pi.slot] || pi.slot);
      }
    }
    if (!changedSlots.length) return '';
    const sign = priceDiff >= 0 ? '+' : '-';
    return `${sign}${formatBudgetDiff(Math.abs(priceDiff))}, khác ở ${changedSlots.join(', ')}`;
  }, [tier, prevTier]);

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col rounded-xl border-2 p-5 text-left transition ${
        selected
          ? 'border-[#C4480A] bg-white shadow-lg shadow-[#C4480A]/10'
          : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
      }`}
    >
      {/* Tier name + badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {tier.name}
        </span>
        {recommended && (
          <span className="rounded bg-[#C4480A] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            AI chọn
          </span>
        )}
      </div>

      {/* Price */}
      <p className="text-2xl font-bold tabular-nums">{formatProductPrice(tier.totalPrice)}</p>

      {/* Budget diff */}
      <p className={`mt-1 text-sm ${diff <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
        {diffLabel}
      </p>

      {/* Description */}
      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{tier.description}</p>

      {/* Component thumbnails */}
      <div className="mt-4 flex gap-1.5">
        {tier.items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex h-10 w-10 items-center justify-center rounded bg-gray-50 border border-gray-200">
            {item.primaryImage ? (
              <img src={item.primaryImage} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <Package className="h-4 w-4 text-gray-300" />
            )}
          </div>
        ))}
      </div>

      {/* Diff from previous tier */}
      {diffItems && (
        <p className="mt-3 text-xs text-gray-400">{diffItems}</p>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER DETAIL
// ═══════════════════════════════════════════════════════════════════════════════

function TierDetail({ tier, tierIdx, result, onTransfer, onAddToCart, cartStatus, cartMsg }: {
  tier: AiBuildPcTier;
  tierIdx: number;
  result: AiBuildPcResult;
  onTransfer: () => void;
  onAddToCart: () => void;
  cartStatus: string;
  cartMsg: string;
}) {
  const [showCompat, setShowCompat] = useState(false);
  const diff = tier.totalPrice - result.budget;

  const cpuItem = tier.items.find(i => i.slot === 'cpu');
  const vgaItem = tier.items.find(i => i.slot === 'vga');
  const titleParts = [cpuItem?.name, vgaItem?.name].filter(Boolean);
  const displayTitle = titleParts.length ? titleParts.join(' + ') : tier.name;

  return (
    <div className="space-y-6">
      {/* Build header */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row">
          {/* Left: images */}
          <div className="flex gap-2 p-5 lg:w-[300px] lg:shrink-0">
            {tier.items.filter(i => i.primaryImage).slice(0, 4).map((item, i) => (
              <div key={i} className="h-20 w-20 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                <img src={item.primaryImage!} alt="" className="h-16 w-16 object-contain" />
              </div>
            ))}
          </div>

          {/* Center: description */}
          <div className="flex-1 p-5 lg:border-l lg:border-gray-200">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              BẢN {tier.name.toUpperCase()}, AI ĐỀ XUẤT
            </p>
            <h2 className="mb-3 text-lg font-bold sm:text-xl">{displayTitle}</h2>

            {result.summary && (
              <p className="mb-4 text-sm text-gray-500">{result.summary}</p>
            )}

            {/* Component list summary */}
            <ul className="space-y-1 text-sm text-gray-600">
              {tier.items.map(item => (
                <li key={item.slot} className="flex gap-2">
                  <span className="text-gray-300">•</span>
                  <span>
                    <strong className="text-gray-500">{SLOT_LABELS[item.slot] || item.slot}:</strong>{' '}
                    {item.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: price + CTAs */}
          <div className="border-t border-gray-200 p-5 lg:w-[280px] lg:shrink-0 lg:border-t-0 lg:border-l">
            <p className="text-2xl font-bold tabular-nums">{formatProductPrice(tier.totalPrice)}</p>
            <p className="mt-0.5 text-xs text-gray-400">tạm tính, giá cuối tính lại khi mở trong Build PC</p>
            <p className={`mt-1 text-sm ${diff <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {diff <= 0 ? `Dư ${formatBudgetDiff(Math.abs(diff))} so với ngân sách` : `Vượt ${formatBudgetDiff(diff)}`}
            </p>

            {/* Component icon grid */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tier.items.map((item, i) => (
                <div key={i} className="h-9 w-9 rounded bg-gray-50 border border-gray-200 flex items-center justify-center" title={SLOT_LABELS[item.slot] || item.slot}>
                  {item.primaryImage ? (
                    <img src={item.primaryImage} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <Package className="h-3.5 w-3.5 text-gray-300" />
                  )}
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="mt-5 space-y-2">
              <button
                onClick={onTransfer}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C4480A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a83b08]"
              >
                <Monitor className="h-4 w-4" />
                Mở trong Build PC để đặt
              </button>
              <button
                onClick={onAddToCart}
                disabled={!tier.canAddToCart || cartStatus === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                {cartStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Thêm tất cả vào giỏ hàng
              </button>
            </div>

            {/* Cart feedback */}
            {cartStatus === 'success' && (
              <div className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600">
                Đã thêm vào giỏ hàng!{' '}
                <Link href="/customer/cart" className="underline">Xem giỏ</Link>
              </div>
            )}
            {cartStatus === 'error' && cartMsg && (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{cartMsg}</div>
            )}
          </div>
        </div>
      </div>

      {/* FPS Estimates */}
      {tier.fpsEstimates?.length > 0 && <FpsTable estimates={tier.fpsEstimates} tierName={tier.name} />}

      {/* Compatibility section */}
      <CompatSection tier={tier} result={result} showDetail={showCompat} onToggle={() => setShowCompat(!showCompat)} />

      {/* Component list */}
      <ComponentList items={tier.items} tierName={tier.name} />

      {/* Cost breakdown */}
      <CostBreakdown items={tier.items} totalPrice={tier.totalPrice} budget={result.budget} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FPS TABLE
// ═══════════════════════════════════════════════════════════════════════════════

function FpsTable({ estimates, tierName }: { estimates: FpsEstimate[]; tierName: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
        <Zap className="h-4 w-4 text-yellow-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider">FPS dự kiến của bản {tierName}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-400">
              <th className="px-5 py-2.5 text-left font-semibold">GAME</th>
              <th className="px-5 py-2.5 text-left font-semibold">ĐỘ PHÂN GIẢI · ĐỒ HOẠ</th>
              <th className="px-5 py-2.5 text-right font-semibold">FPS</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((e, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-5 py-3 font-medium">{e.game}</td>
                <td className="px-5 py-3 text-gray-500">{e.resolution}</td>
                <td className="px-5 py-3 text-right">
                  <span className="font-bold tabular-nums text-green-600">{e.fpsRange}</span>
                  {e.estimated && (
                    <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700">
                      ƯỚC TÍNH
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function CompatSection({ tier, result, showDetail, onToggle }: {
  tier: AiBuildPcTier;
  result: AiBuildPcResult;
  showDetail: boolean;
  onToggle: () => void;
}) {
  const parsed = result.parsedRequirements || {};
  const inStockCount = tier.items.filter(i => (i.stockQuantity ?? 0) > 0).length;
  const issueCount = tier.compatibilityIssues?.length ?? 0;
  const passCount = 14 - issueCount;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
        <Shield className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider">AI đối chiếu với yêu cầu của bạn</h3>
      </div>
      <div className="p-5">
        {/* Requirement checks */}
        <div className="mb-4 flex flex-wrap gap-3">
          {result.budget > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Ngân sách tối đa {(result.budget / 1_000_000).toFixed(0)} triệu
            </span>
          )}
          {tier.totalPrice <= result.budget && (
            <span className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Còn dư ngân sách {formatBudgetDiff(result.budget - tier.totalPrice)}
            </span>
          )}
          {(parsed.games?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Chơi {parsed.games!.join(', ')}
            </span>
          )}
        </div>

        {/* Summary stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${tier.compatibilityStatus === 'pass' ? 'text-green-600' : 'text-amber-600'}`}>
              {passCount}/{passCount + issueCount}
            </span>
            <span className="text-gray-500">luật tương thích đạt</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-blue-600">{inStockCount}/{tier.items.length}</span>
            <span className="text-gray-500">linh kiện còn hàng</span>
          </div>
        </div>

        {/* Compatibility issues */}
        {tier.compatibilityIssues?.length > 0 && (
          <div className="mt-4 space-y-2">
            {tier.compatibilityIssues.map((issue, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                issue.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {issue.level === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Toggle detail */}
        <button
          onClick={onToggle}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#C4480A] hover:text-[#e05510] transition"
        >
          {showDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDetail ? 'Ẩn chi tiết' : 'Xem từng luật đã kiểm'}
        </button>

        {showDetail && tier.compatibilityIssues?.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">Tất cả các luật tương thích đều đạt. Cấu hình này an toàn để sử dụng.</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT LIST
// ═══════════════════════════════════════════════════════════════════════════════

function ComponentList({ items, tierName }: { items: AiBuildPcItem[]; tierName: string }) {
  const total = items.reduce((s, i) => s + i.lineTotal, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
        <Cpu className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider">
          {items.length} linh kiện trong bản {tierName}
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map(item => (
          <div key={item.slot} className="flex gap-4 px-5 py-4">
            {/* Image */}
            <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-200">
              {item.primaryImage ? (
                <img src={item.primaryImage} alt="" className="h-14 w-14 object-contain" />
              ) : (
                <Package className="h-6 w-6 text-gray-300" />
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                {SLOT_LABELS[item.slot] || item.slot}
              </p>
              <p className="text-sm font-medium line-clamp-2">{item.name}</p>
              {item.reason && (
                <p className="mt-1 text-xs text-gray-400">
                  <span className="text-gray-500">Vì sao chọn:</span> {item.reason}
                </p>
              )}
            </div>

            {/* Price + stock */}
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold tabular-nums">{formatProductPrice(item.lineTotal)}</p>
              <p className={`mt-0.5 text-xs ${(item.stockQuantity ?? 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(item.stockQuantity ?? 0) > 0 ? 'Còn hàng' : 'Hết hàng'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-4">
        <span className="text-sm font-bold">Thanh toán tạm tính</span>
        <span className="text-lg font-bold tabular-nums text-[#C4480A]">{formatProductPrice(total)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST BREAKDOWN
// ═══════════════════════════════════════════════════════════════════════════════

function CostBreakdown({ items, totalPrice, budget }: {
  items: AiBuildPcItem[];
  totalPrice: number;
  budget: number;
}) {
  const breakdown = useMemo(() => {
    return items
      .map(item => ({
        slot: item.slot,
        label: SLOT_LABELS[item.slot] || item.slot,
        amount: item.lineTotal,
        percent: totalPrice > 0 ? Math.round((item.lineTotal / totalPrice) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [items, totalPrice]);

  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500',
    'bg-indigo-500', 'bg-teal-500',
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
        <BarChart3 className="h-4 w-4 text-cyan-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Tiền được đổn vào đâu</h3>
      </div>
      <div className="p-5">
        {/* Stacked bar */}
        <div className="mb-4 flex h-6 overflow-hidden rounded-full bg-gray-100">
          {breakdown.map((b, i) => (
            <div
              key={b.slot}
              className={`${colors[i % colors.length]} transition-all`}
              style={{ width: `${b.percent}%` }}
              title={`${b.label}: ${b.percent}%`}
            />
          ))}
        </div>

        {/* Legend grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {breakdown.map((b, i) => (
            <div key={b.slot} className="flex items-center gap-2 text-sm">
              <div className={`h-3 w-3 shrink-0 rounded-sm ${colors[i % colors.length]}`} />
              <span className="text-gray-500">{b.label}</span>
              <span className="ml-auto font-medium tabular-nums">{b.percent}%</span>
              <span className="text-xs text-gray-400 tabular-nums">{formatProductPrice(b.amount)}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Tổng {formatProductPrice(totalPrice)} trên ngân sách {formatProductPrice(budget)}.
          {totalPrice <= budget && ` Dư ${formatBudgetDiff(budget - totalPrice)}.`}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFINEMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function RefinementSection({ onRefine }: { onRefine: (mod: string) => void }) {
  const [input, setInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onRefine(input.trim());
    setInput('');
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
        <Sparkles className="h-4 w-4 text-[#C4480A]" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Bảo AI chỉnh lại</h3>
      </div>
      <div className="p-5">
        {/* Preset buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {REFINEMENT_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => onRefine(preset)}
              className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 transition hover:border-[#C4480A] hover:text-[#C4480A]"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="VD: đổi sang CPU Intel, bỏ cái case này, giữ nguyên card"
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#C4480A] transition"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-[#C4480A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a83b08] disabled:opacity-40"
          >
            Chỉnh lại
          </button>
        </form>
      </div>
    </div>
  );
}
