'use client';

import { useEffect, useRef } from 'react';
import AIChatWelcome from './AIChatWelcome';
import AIChatMessage from './AIChatMessage';
import type { ChatMessage } from '@/types/ai.type';

export default function AIChatMessages({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, lastMessage?.content]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <AIChatWelcome />
      ) : (
        <div className="space-y-3 p-4">
          {messages.map(message => <AIChatMessage key={message.id} message={message} />)}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
