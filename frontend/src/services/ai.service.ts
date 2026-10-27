import { apiRequest } from './http.client';
import type { AiStatus, AiChatRequest, AiChatResponse } from '@/types/ai.type';

export const getAiStatus = (signal?: AbortSignal) =>
  apiRequest<{ success: boolean; data: AiStatus }>('/ai/status', { signal });

// Resolves normally even when the backend reports the feature unavailable
// (HTTP 501) — ApiRequestError.status lets callers (useAIChat) distinguish
// "AI isn't configured yet" from an actual network/server failure instead of
// treating every non-2xx the same way.
export const postAiChat = (request: AiChatRequest, token: string | null, signal?: AbortSignal) =>
  apiRequest<{ success: boolean; data: AiChatResponse }>(
    '/ai/chat',
    { method: 'POST', body: JSON.stringify(request), signal },
    token,
  );
