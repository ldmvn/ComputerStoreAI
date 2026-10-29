'use client';

import AIChatHeader from './AIChatHeader';
import AIChatMessages from './AIChatMessages';
import AIChatInput from './AIChatInput';
import type { AIChatSession } from '@/hooks/useAIChat';

export default function AIChatWindow({ chat, onBack, onClose }: { chat: AIChatSession; onBack: () => void; onClose: () => void }) {
  const { chatAvailable, messages, sending, sendMessage, reset } = chat;

  return (
    <div
      role="dialog"
      aria-label="Chatbot AI"
      className="flex h-[min(520px,calc(100dvh-140px))] w-[min(340px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
    >
      <AIChatHeader onBack={onBack} onClose={onClose} onReset={reset} />
      <AIChatMessages messages={messages} />
      <AIChatInput disabled={!chatAvailable} sending={sending} onSend={sendMessage} />
    </div>
  );
}
