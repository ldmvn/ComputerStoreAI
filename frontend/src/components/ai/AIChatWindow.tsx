'use client';

import AIChatHeader from './AIChatHeader';
import AIChatMessages from './AIChatMessages';
import AIChatInput from './AIChatInput';
import { useAIChat } from '@/hooks/useAIChat';

export default function AIChatWindow({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { chatAvailable, messages, sending, sendMessage } = useAIChat();

  return (
    <div
      role="dialog"
      aria-label="Chatbot AI"
      className="flex h-[min(520px,calc(100dvh-140px))] w-[min(340px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
    >
      <AIChatHeader onBack={onBack} onClose={onClose} />
      <AIChatMessages messages={messages} onNavigate={onClose} />
      <AIChatInput disabled={!chatAvailable} sending={sending} onSend={sendMessage} />
    </div>
  );
}
