'use client';

// UI-only demo: no real chat/API integration. Clicking a contact just
// opens the panel — hook up real Messenger/Zalo/Telegram/AI links here
// when those integrations are ready.

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FloatingSupportToggle from './FloatingSupportToggle';
import FloatingSupportPanel from './FloatingSupportPanel';

function ToggleArrow({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={expanded ? 'Thu gọn hỗ trợ' : 'Mở rộng hỗ trợ'}
      title={expanded ? 'Thu gọn' : 'Mở rộng'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-md shadow-slate-900/10 ring-1 ring-slate-200 transition-transform duration-200 hover:scale-105 hover:text-primary-600"
    >
      {expanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );
}

export default function FloatingSupportWidget() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-5 right-0 z-[80] sm:bottom-6">
      {expanded ? (
        <div className="flex animate-support-panel-in items-start gap-2.5">
          <ToggleArrow expanded onClick={() => setExpanded(false)} />
          <FloatingSupportPanel onClose={() => setExpanded(false)} />
        </div>
      ) : (
        <div className="relative animate-support-toggle-in">
          <FloatingSupportToggle onSelect={() => setExpanded(true)} />
          <div className="absolute -left-3 top-2">
            <ToggleArrow expanded={false} onClick={() => setExpanded(true)} />
          </div>
        </div>
      )}
    </div>
  );
}
