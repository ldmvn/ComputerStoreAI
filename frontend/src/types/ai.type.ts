// Mirrors backend/src/ai/validators/aiChat.validator.js and
// backend/src/ai/config/ai.config.js#getAiStatus — keep these in sync with
// the backend contract, not the other way around.

export type AiStatus = {
  enabled: boolean;
  chatAvailable: boolean;
  ragAvailable: boolean;
  buildPcAvailable: boolean;
};

export type AiChatContext = 'general' | 'product_advice' | 'order_lookup' | 'build_pc' | 'faq';

export type AiChatRequest = {
  message: string;
  conversationId: string | null;
  context?: AiChatContext;
};

export type AiCitation = {
  documentId: string;
  sourceType: string;
  sourceRef: string;
  title?: string;
  score: number;
  productId: number | null;
};

export type AiToolCallResult = {
  name: string;
  result: unknown;
};

export type AiChatResponse = {
  reply: string;
  conversationId: string;
  citations: AiCitation[];
  toolCalls: AiToolCallResult[];
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status: 'sending' | 'sent' | 'error';
  createdAt: number;
};
