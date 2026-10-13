'use client';

import { Plus, Trash2, Minus } from 'lucide-react';
import { mediaUrl } from '@/services/http.client';
import { formatProductPrice } from '@/lib/product';
import { useBuild } from './BuildProvider';
import type { BuildSlot } from '@/types/buildPc.type';

type Props = { slot: BuildSlot };

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100">
      <svg viewBox="0 0 32 32" className="h-6 w-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="26" height="26" rx="3" />
        <circle cx="11" cy="11" r="3" />
        <path d="M3 22 l8-8 6 6 4-4 8 8" />
      </svg>
    </div>
  );
}

export default function BuildRow({ slot }: Props) {
  const { items, slots, openPicker, removeProduct, setItemQuantity, validationResult } = useBuild();
  const item = items[slot.slug];

  // Check if locked by exclusiveGroup
  const isLocked = !!slot.exclusiveGroup &&
    !item &&
    slots.some(
      s =>
        s.exclusiveGroup === slot.exclusiveGroup &&
        s.slug !== slot.slug &&
        !!items[s.slug]
    );

  const lockingSlot = isLocked
    ? slots.find(
        s => s.exclusiveGroup === slot.exclusiveGroup && s.slug !== slot.slug && !!items[s.slug]
      )
    : null;

  const slotIssues = validationResult?.issues.filter(
    i => (i.level === 'error' || i.level === 'warning') && i.slots.includes(slot.slug)
  ) ?? [];
  const hasError   = slotIssues.some(i => i.level === 'error');
  const hasWarning = !hasError && slotIssues.some(i => i.level === 'warning');

  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
      {/* Slot name */}
      <div className="w-36 shrink-0 pt-0.5">
        <span className="text-sm font-medium text-slate-700">{slot.name}</span>
        {slot.isRequired && (
          <span className="ml-1 text-xs text-red-500">*</span>
        )}
        {slot.badgeText && (
          <p className="mt-0.5 text-xs font-bold italic text-blue-800">{slot.badgeText}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {item ? (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {/* Product row — highlighted when issues exist */}
            <div className={`flex items-center gap-2 rounded ${hasError ? 'ring-1 ring-red-300 bg-red-50/40 px-1 -mx-1 py-0.5' : hasWarning ? 'ring-1 ring-amber-300 bg-amber-50/40 px-1 -mx-1 py-0.5' : ''}`}>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                {item.product.primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(item.product.primaryImage)}
                    alt={item.product.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <ImagePlaceholder />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-800">{item.product.name}</p>
                <p className="text-xs font-semibold text-[#C4480A]">{formatProductPrice(item.product.price)}</p>
              </div>

              {/* Quantity controls */}
              {slot.maxCount > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setItemQuantity(slot.slug, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Giảm"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => setItemQuantity(slot.slug, item.quantity + 1)}
                    disabled={item.quantity >= slot.maxCount}
                    className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Tăng"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              )}

              {/* Change + Remove */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => openPicker(slot.slug)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Đổi
                </button>
                <button
                  onClick={() => removeProduct(slot.slug)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Xóa"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Issue messages (error/warning only, not info) */}
            {slotIssues.map((issue, idx) => (
              <p key={idx} className={`text-xs px-1 ${issue.level === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                {issue.message}
              </p>
            ))}
          </div>
        ) : isLocked ? (
          <div className="text-xs text-slate-400 italic">
            Đã chọn <span className="font-medium text-slate-600">{lockingSlot?.name}</span> — xóa để chọn slot này
          </div>
        ) : (
          <button
            onClick={() => openPicker(slot.slug)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700 active:bg-slate-900"
          >
            <Plus size={13} />
            Chọn {slot.name}
          </button>
        )}
      </div>
    </div>
  );
}
