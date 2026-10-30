'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import FloatingSupportToggle from './FloatingSupportToggle';
import FloatingSupportPanel from './FloatingSupportPanel';
import AIChatWindow from '@/components/ai/AIChatWindow';
import { useAIChat } from '@/hooks/useAIChat';
import { getPublicStoreInfo } from '@/services/adminSettings.service';
import { resolveWidgetConfig, resolveWidgetConfigOnFetchError, type ResolvedWidgetConfig } from '@/lib/supportWidget';
import { supportPanelVariants, panelTransition } from '@/components/ui/motion/transitions';

type View = 'support' | 'chat';

export default function FloatingSupportWidget() {
  const chat = useAIChat();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('support');
  const [config, setConfig] = useState<ResolvedWidgetConfig | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getPublicStoreInfo(ctrl.signal)
      .then(res => setConfig(resolveWidgetConfig(res.data ?? {})))
      .catch(e => { if (e?.name !== 'AbortError') setConfig(resolveWidgetConfigOnFetchError()); });
    return () => ctrl.abort();
  }, []);

  const closeAll = () => { setIsOpen(false); setView('support'); };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) closeAll();
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeAll(); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="fixed bottom-5 right-4 z-[80] flex flex-col items-end gap-3 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <m.div
            key="support-panel"
            variants={supportPanelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={panelTransition}
          >
            {view === 'chat' ? (
              <AIChatWindow chat={chat} onBack={() => setView('support')} onClose={closeAll} />
            ) : (
              <FloatingSupportPanel config={config} onClose={closeAll} onOpenChat={() => setView('chat')} />
            )}
          </m.div>
        )}
      </AnimatePresence>
      <FloatingSupportToggle isOpen={isOpen} toggleAvatarUrl={config?.toggleAvatarUrl} onClick={() => (isOpen ? closeAll() : setIsOpen(true))} />
    </div>
  );
}
