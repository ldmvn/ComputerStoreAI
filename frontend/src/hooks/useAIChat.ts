'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAiStatus, postAiChat } from '@/services/ai.service';
import { ApiRequestError } from '@/services/http.client';
import { useAuthStore } from '@/store/auth.store';
import type { AiStatus, ChatMessage, AiChatContext } from '@/types/ai.type';
import { saveSession, loadSession, clearSession } from '@/lib/chatHistory';

const UNAVAILABLE_NOTICE = 'Tính năng trò chuyện AI đang được phát triển.';

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function useAIChat() {
  const token = useAuthStore(s => s.token);
  const ownerId = useAuthStore(s => s.user?.id ?? null);
  const ownerRef = useRef(ownerId);
  const conversationRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const generationRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadSession(ownerId);
    if (saved) return saved.messages;
    return [];
  });
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    const saved = loadSession(ownerId);
    return saved?.conversationId ?? null;
  });
  const hydratedRef = useRef(false);

  // Sync conversationRef from restored localStorage state on mount
  if (!hydratedRef.current) {
    hydratedRef.current = true;
    const saved = loadSession(ownerId);
    if (saved) conversationRef.current = saved.conversationId;
  }

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
    if (!trimmed || sendingRef.current) return;

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
    const generation = generationRef.current;
    const activeConversation = conversationRef.current || makeId();
    conversationRef.current = activeConversation;
    setConversationId(activeConversation);
    const controller = new AbortController();
    requestRef.current = controller;
    sendingRef.current = true;
    setMessages(prev => [...prev, { id: pendingId, role: 'assistant', content: '', status: 'sending', createdAt: Date.now() }]);
    setSending(true);

    postAiChat({ message: trimmed, conversationId: activeConversation, context }, token, controller.signal)
      .then(res => {
        if (generation !== generationRef.current) return;
        conversationRef.current = res.data.conversationId;
        setConversationId(res.data.conversationId);
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: res.data.reply, citations: res.data.citations, status: 'sent' } : m));
      })
      .catch(e => {
        if (generation !== generationRef.current || e?.name === 'AbortError') return;
        let message: string;
        if (e instanceof ApiRequestError && e.status === 501) {
          message = UNAVAILABLE_NOTICE;
        } else if (e instanceof ApiRequestError && e.status === 429) {
          message = e.message || 'Hệ thống AI đang quá tải. Vui lòng thử lại sau ít phút.';
        } else {
          message = e instanceof Error ? e.message : 'Không gửi được tin nhắn. Vui lòng thử lại.';
        }
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: message, status: 'error' } : m));
      })
      .finally(() => { if (generation === generationRef.current) { sendingRef.current = false; setSending(false); requestRef.current = null; } });
  }, [chatAvailable, token]);

  // Persist to localStorage whenever messages settle (skip while sending)
  useEffect(() => {
    if (sending) return;
    const cid = conversationRef.current;
    if (cid && messages.length > 0) {
      saveSession(ownerRef.current, cid, messages);
    }
  }, [messages, sending]);

  const reset = useCallback(() => {
    generationRef.current++;
    requestRef.current?.abort();
    requestRef.current = null;
    clearSession(ownerRef.current);
    conversationRef.current = null;
    sendingRef.current = false;
    setSending(false);
    setMessages([]);
    setConversationId(null);
  }, []);

  useEffect(() => {
    if (ownerRef.current !== ownerId) {
      // Clear in-flight state for the old owner
      generationRef.current++;
      requestRef.current?.abort();
      requestRef.current = null;
      sendingRef.current = false;
      setSending(false);
      ownerRef.current = ownerId;

      // Load the new owner's saved session (or start fresh)
      const saved = loadSession(ownerId);
      if (saved) {
        conversationRef.current = saved.conversationId;
        setConversationId(saved.conversationId);
        setMessages(saved.messages);
      } else {
        conversationRef.current = null;
        setConversationId(null);
        setMessages([]);
      }
    }
  }, [ownerId]);
  useEffect(() => () => { generationRef.current++; requestRef.current?.abort(); }, []);

  return { status, chatAvailable, messages, sending, conversationId, sendMessage, reset };
}
export type AIChatSession = ReturnType<typeof useAIChat>;
