'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLLAPSED_MAX_HEIGHT = 'max-h-[360px]';

function isRichHtml(text: string) {
  return /<[a-z][\s\S]*>/i.test(text);
}

export default function ProductDescription({ description }: { description?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const text = description?.trim() || '';
  if (!text) return null;

  const rich = isRichHtml(text);

  return (
    <section
      id="product-description"
      aria-labelledby="product-description-heading"
      className="min-w-0 scroll-mt-36 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <h2 id="product-description-heading" className="mb-3 text-lg font-semibold text-slate-900">
        Mô tả sản phẩm
      </h2>
      <style>{`
        .product-desc h2 { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 1.2em 0 0.5em; }
        .product-desc h3 { font-size: 0.975rem; font-weight: 600; color: #1e293b; margin: 1em 0 0.4em; }
        .product-desc h4 { font-size: 0.9rem; font-weight: 600; color: #334155; margin: 0.9em 0 0.3em; }
        .product-desc p { margin: 0.35em 0; }
        .product-desc ul { list-style: disc; padding-left: 1.4em; margin: 0.35em 0; }
        .product-desc ol { list-style: decimal; padding-left: 1.4em; margin: 0.35em 0; }
        .product-desc li { margin: 0.2em 0; }
        .product-desc blockquote { border-left: 3px solid #c4480a; padding-left: 1em; margin: 0.7em 0; color: #64748b; font-style: italic; }
        .product-desc a { color: #c4480a; text-decoration: underline; }
        .product-desc img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5em 0; display: block; }
        .product-desc table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: 0.8em 0; overflow-x: auto; display: block; }
        .product-desc th, .product-desc td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; vertical-align: top; word-break: break-word; min-width: 60px; }
        .product-desc th { background: #f8fafc; font-weight: 600; font-size: 0.85rem; }
      `}</style>
      <div className={`relative overflow-hidden transition-[max-height] duration-300 ease-out ${expanded ? 'max-h-none' : COLLAPSED_MAX_HEIGHT}`}>
        {rich ? (
          <div
            id="product-description-content"
            className="product-desc text-sm leading-7 text-slate-600"
            dangerouslySetInnerHTML={{ __html: text }}
          />
        ) : (
          <div
            id="product-description-content"
            className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600"
          >
            {text}
          </div>
        )}
        {!expanded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-white"
          />
        )}
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          aria-controls="product-description-content"
          aria-label={expanded ? 'Thu gọn mô tả' : 'Xem thêm mô tả'}
          title={expanded ? 'Thu gọn mô tả' : 'Xem thêm mô tả'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}