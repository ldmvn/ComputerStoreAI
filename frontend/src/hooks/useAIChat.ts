'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAiStatus, postAiChat } from '@/services/ai.service';
import { ApiRequestError } from '@/services/http.client';
import { useAuthStore } from '@/store/auth.store';
import type { AiStatus, ChatMessage, AiChatContext } from '@/types/ai.type';

const UNAVAILABLE_NOTICE = 'Tính năng trò chuyện AI đang được phát triển.';

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function useAIChat() {
  const token = useAuthStore(s => s.token);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getAiStatus(ctrl.signal)
      .then(res => setStatus(res.data))
      .catch(() => setStatus({ enabled: false, chatAvailable: false, ragAvailable: false, buildPcAvailable: false }));
    return () => ctrl.abort();
  }, []);

  const chatAvailable = status?.chatAvailable ?? false;

  const sendMessage = useCallback((text: string, context: AiChatContext = 'general') => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { id: makeId(), role: 'user', content: trimmed, status: 'sent', createdAt: Date.now() };
    setMessages(prev => [...prev, userMessage]);

    // Never send a request or fabricate a reply while AI is unavailable —
    // the Chat Window still shows the explicit "being developed" notice.
    if (!chatAvailable) {
      setMessages(prev => [...prev, {
        id: makeId(), role: 'assistant', content: UNAVAILABLE_NOTICE, status: 'sent', createdAt: Date.now(),
      }]);
      return;
    }

    const pendingId = makeId();
    setMessages(prev => [...prev, { id: pendingId, role: 'assistant', content: '', status: 'sending', createdAt: Date.now() }]);
    setSending(true);

    postAiChat({ message: trimmed, conversationId, context }, token)
      .then(res => {
        setConversationId(res.data.conversationId);
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: res.data.reply, status: 'sent' } : m));
      })
      .catch(e => {
        const message = e instanceof ApiRequestError && e.status === 501
          ? UNAVAILABLE_NOTICE
          : e instanceof Error ? e.message : 'Không gửi được tin nhắn. Vui lòng thử lại.';
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: message, status: 'error' } : m));
      })
      .finally(() => setSending(false));
  }, [chatAvailable, conversationId, sending, token]);

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { status, chatAvailable, messages, sending, sendMessage, reset };
}
