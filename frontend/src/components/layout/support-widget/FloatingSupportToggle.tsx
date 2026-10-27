'use client';

import { MessageCircle } from 'lucide-react';
import MascotAvatar from './MascotAvatar';

// Nút tròn duy nhất mở/đóng panel "Liên hệ hỗ trợ" — không còn cột 4 icon
// hay nút mũi tên riêng như bản cũ.
export default function FloatingSupportToggle({ isOpen, toggleAvatarUrl, onClick }: { isOpen: boolean; toggleAvatarUrl?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Đóng liên hệ hỗ trợ' : 'Mở liên hệ hỗ trợ'}
      title="Liên hệ hỗ trợ"
      className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-primary-600 shadow-lg shadow-primary-600/35 transition-transform duration-200 ease-out hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:h-16 sm:w-16"
    >
      <span className="block h-full w-full overflow-hidden rounded-full">
        <MascotAvatar src={toggleAvatarUrl} />
      </span>
      {!isOpen && (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary-600 ring-2 ring-white"
          aria-hidden="true"
        >
          <MessageCircle className="h-3 w-3" strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}
