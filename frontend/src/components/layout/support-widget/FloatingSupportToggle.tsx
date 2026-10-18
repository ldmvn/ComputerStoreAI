'use client';

import { MessageCircle } from 'lucide-react';

// Nút tròn duy nhất mở/đóng panel "Liên hệ hỗ trợ" — không còn cột 4 icon
// hay nút mũi tên riêng như bản cũ.
export default function FloatingSupportToggle({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Đóng liên hệ hỗ trợ' : 'Mở liên hệ hỗ trợ'}
      title="Liên hệ hỗ trợ"
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/35 transition-transform duration-200 ease-out hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
      {!isOpen && (
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
      )}
    </button>
  );
}
