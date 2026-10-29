'use client';

// Zalo/Messenger/Telegram stay UI-only demo links — hook up real
// integrations when ready. Chatbot AI opens a real Chat Window backed by
// backend/src/ai (currently reports "not available" until a provider is
// configured; see docs/ai-architecture.md).

import { useEffect, useRef, useState } from 'react';
import FloatingSupportToggle from './FloatingSupportToggle';
import FloatingSupportPanel from './FloatingSupportPanel';
import AIChatWindow from '@/components/ai/AIChatWindow';
import { useAIChat } from '@/hooks/useAIChat';
import { getPublicStoreInfo } from '@/services/adminSettings.service';
import { resolveWidgetConfig, resolveWidgetConfigOnFetchError, type ResolvedWidgetConfig } from '@/lib/supportWidget';

type View = 'support' | 'chat';

export default function FloatingSupportWidget() {
  // Keep the session alive while the chat panel is closed or showing Support.
  const chat = useAIChat();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('support');
  const [config, setConfig] = useState<ResolvedWidgetConfig | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cấu hình (tên/mô tả/logo/thứ tự/bật-tắt) lấy từ Store Settings — Admin
  // chỉnh trong Dashboard, Storefront tự phản ánh mà không cần sửa code.
  // Lỗi mạng/API giữ fallback mặc định, không tự bật lại kênh Admin đã tắt.
  useEffect(() => {
    const ctrl = new AbortController();
    getPublicStoreInfo(ctrl.signal)
      .then(res => setConfig(resolveWidgetConfig(res.data ?? {})))
      .catch(e => { if (e?.name !== 'AbortError') setConfig(resolveWidgetConfigOnFetchError()); });
    return () => ctrl.abort();
  }, []);

  // Closing the widget (Escape, outside click, the X button) always also
  // resets the view back to the Support Panel, so reopening never strands
  // the visitor inside the Chat Window — matches "chỉ một panel mở tại một
  // thời điểm" and "không có Popup chồng nhau".
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
      {isOpen && (
        <div className="animate-support-panel-in">
          {view === 'chat' ? (
            <AIChatWindow chat={chat} onBack={() => setView('support')} onClose={closeAll} />
          ) : (
            <FloatingSupportPanel config={config} onClose={closeAll} onOpenChat={() => setView('chat')} />
          )}
        </div>
      )}
      <FloatingSupportToggle isOpen={isOpen} toggleAvatarUrl={config?.toggleAvatarUrl} onClick={() => (isOpen ? closeAll() : setIsOpen(true))} />
    </div>
  );
}
