'use client';

// UI-only demo: no real chat/API integration. Clicking a contact just
// shows the panel — hook up real Messenger/Zalo/Telegram/AI links here
// when those integrations are ready.

import { useEffect, useRef, useState } from 'react';
import FloatingSupportToggle from './FloatingSupportToggle';
import FloatingSupportPanel from './FloatingSupportPanel';

export default function FloatingSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="fixed bottom-5 right-4 z-[80] flex flex-col items-end gap-3 sm:right-6">
      {isOpen && (
        <div className="animate-support-panel-in">
          <FloatingSupportPanel onClose={() => setIsOpen(false)} />
        </div>
      )}
      <FloatingSupportToggle isOpen={isOpen} onClick={() => setIsOpen(v => !v)} />
    </div>
  );
}
