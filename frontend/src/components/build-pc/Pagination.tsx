'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-3" aria-label="Phân trang">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="ui-button flex h-8 w-8 items-center justify-center rounded-lg text-primary-700 hover:bg-primary-50 active:bg-primary-100 disabled:cursor-not-allowed disabled:text-primary-300"
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="flex h-8 w-8 items-center justify-center text-slate-400 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`ui-button flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
              p === page
                ? 'ui-button--primary bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
                : 'text-primary-700 hover:bg-primary-50 active:bg-primary-100'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="ui-button flex h-8 w-8 items-center justify-center rounded-lg text-primary-700 hover:bg-primary-50 active:bg-primary-100 disabled:cursor-not-allowed disabled:text-primary-300"
        aria-label="Trang sau"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
