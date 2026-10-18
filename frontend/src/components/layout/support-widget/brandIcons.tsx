// Real Messenger/Zalo marks (cropped from the official logos, transparent
// background) — not hand-drawn recreations.

import Image from 'next/image';

export function MessengerGlyph({ className }: { className?: string }) {
  return (
    <span className={`relative block overflow-hidden ${className ?? ''}`}>
      <Image src="/icons/messenger.png" alt="Messenger" fill sizes="48px" className="object-cover" />
    </span>
  );
}

export function ZaloGlyph({ className }: { className?: string }) {
  return (
    <span className={`relative block ${className ?? ''}`}>
      <Image src="/icons/zalo.png" alt="Zalo" fill sizes="32px" className="object-contain" />
    </span>
  );
}
