import type { ChatMessage, AiCitation } from '@/types/ai.type';

const STORAGE_PREFIX = 'ducmanh_chat_';
const MAX_MESSAGES = 100;
const MAX_BYTES = 512 * 1024; // 512 KB
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type StoredSession = {
  conversationId: string;
  messages: ChatMessage[];
  savedAt: number;
};

function storageKey(ownerId: number | null): string {
  return `${STORAGE_PREFIX}${ownerId ?? 'guest'}`;
}

function stripSensitive(msg: ChatMessage): ChatMessage {
  const safe = { ...msg };
  if (safe.citations) {
    safe.citations = safe.citations.map(c => ({
      sourceNumber: c.sourceNumber,
      chunkId: c.chunkId,
      sku: c.sku,
      updatedAt: c.updatedAt,
      documentId: c.documentId,
      sourceType: c.sourceType,
      sourceRef: c.sourceRef,
      title: c.title,
      score: c.score,
      productId: c.productId,
    }) as AiCitation);
  }
  return safe;
}

export function saveSession(ownerId: number | null, conversationId: string, messages: ChatMessage[]): void {
  try {
    const trimmed = messages
      .filter(m => m.status !== 'sending')
      .slice(-MAX_MESSAGES)
      .map(stripSensitive);
    const data: StoredSession = { conversationId, messages: trimmed, savedAt: Date.now() };
    const json = JSON.stringify(data);
    if (json.length > MAX_BYTES) return;
    localStorage.setItem(storageKey(ownerId), json);
  } catch { /* quota exceeded or blocked — silently degrade */ }
}

export function loadSession(ownerId: number | null): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    if (!raw) return null;
    const data: StoredSession = JSON.parse(raw);
    if (!data.conversationId || !Array.isArray(data.messages)) return null;
    if (Date.now() - data.savedAt > TTL_MS) {
      localStorage.removeItem(storageKey(ownerId));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSession(ownerId: number | null): void {
  try {
    localStorage.removeItem(storageKey(ownerId));
  } catch { /* blocked — ignore */ }
}

export function clearAllSessions(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
