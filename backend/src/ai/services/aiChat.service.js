// Chatbot AI orchestration. This is the one place that will eventually call
// an AIProvider, decide when to pull RAG context, and offer tool calls
// (product search, compatibility check, order lookup) to the model.
//
// Today isChatConfigured() is always false (no AI_PROVIDER/AI_MODEL set),
// so sendChatMessage() always throws providerUnavailableError() — it never
// fabricates a reply. The orchestration order below is real, already-wired
// code, not a comment describing intent: once a concrete AIProvider is
// registered via setProvider(), this function starts actually running it.

import { randomUUID } from 'node:crypto';
import { isChatConfigured, isRagConfigured, aiConfig } from '../config/ai.config.js';
import { UnavailableProvider, providerUnavailableError } from '../providers/aiProvider.interface.js';
import { queryRag } from '../rag/rag.service.js';
import { productSearchToolDefinition, searchProducts } from '../tools/productSearch.tool.js';
import { compatibilityToolDefinition, checkBuildCompatibility } from '../tools/compatibility.tool.js';
import { orderLookupToolDefinition, lookupMyOrders } from '../tools/orderLookup.tool.js';

// Swapped for a real adapter (OpenAiProvider, GeminiProvider, …) via
// setProvider() once one is implemented under providers/. Kept module-level
// (not a constructor arg) so controllers/tests don't need to thread a
// provider instance through every call — there is exactly one active
// provider per process, matching AI_PROVIDER in config.
let activeProvider = new UnavailableProvider();

/** Registration point for a future concrete AIProvider implementation. */
export function setProvider(provider) {
  activeProvider = provider;
}

// Tools offered to the model, keyed by name so a future provider's tool-call
// response (`{ name: 'search_products', arguments: {...} }`) can dispatch
// directly: TOOLS[name].definition / TOOLS[name].run(args, ctx).
const TOOLS = {
  search_products: { definition: productSearchToolDefinition, run: (args) => searchProducts(args) },
  check_build_compatibility: { definition: compatibilityToolDefinition, run: (args) => checkBuildCompatibility(args) },
  lookup_my_orders: { definition: orderLookupToolDefinition, run: (args, ctx) => lookupMyOrders(args, ctx.userId) },
};

/**
 * @returns {{ enabled: boolean, chatAvailable: boolean, ragAvailable: boolean, buildPcAvailable: boolean }}
 */
export function getChatStatus() {
  return { enabled: aiConfig.enabled, chatAvailable: isChatConfigured(), ragAvailable: isRagConfigured(), buildPcAvailable: isChatConfigured() };
}

/**
 * @param {{ message: string, conversationId: string|null, context?: string }} input
 * @param {{ userId: number|null }} ctx - userId is set only for authenticated requests (optionalAuth)
 * @returns {Promise<{ reply: string, conversationId: string, citations: object[], toolCalls: object[] }>}
 */
export async function sendChatMessage(input, ctx = { userId: null }) {
  if (!isChatConfigured()) throw providerUnavailableError();

  // Grounded answers for "product_advice"/"faq" contexts pull RAG context
  // first when RAG is configured; structured facts (price/stock/orders)
  // always go through the tools above, never through RAG (see §10).
  const context = isRagConfigured() && ['product_advice', 'faq'].includes(input.context)
    ? await queryRag({ query: input.message, topK: 5 })
    : { contextText: '', citations: [], hasContext: false };

  const messages = [
    { role: 'system', content: buildSystemPrompt(context.contextText) },
    { role: 'user', content: input.message },
  ];

  const completion = await activeProvider.complete({
    messages,
    tools: Object.values(TOOLS).map(t => t.definition),
  });

  // Tool-call dispatch loop: the provider contract (aiProvider.interface.js)
  // may return toolCalls instead of a final answer; this resolves each
  // against the real backend services above and would be re-submitted to
  // the provider as tool results on a second round-trip once a concrete
  // provider exists to drive that protocol.
  const resolvedToolCalls = [];
  for (const call of completion.toolCalls ?? []) {
    const tool = TOOLS[call.name];
    if (!tool) continue;
    resolvedToolCalls.push({ name: call.name, result: await tool.run(call.arguments ?? {}, ctx) });
  }

  return {
    reply: completion.content,
    conversationId: input.conversationId ?? randomUUID(),
    citations: context.citations,
    toolCalls: resolvedToolCalls,
  };
}

function buildSystemPrompt(ragContext) {
  const base = [
    'Bạn là trợ lý AI của DUCMANH PC, cửa hàng máy tính và laptop tại Việt Nam.',
    'Trả lời bằng tiếng Việt, ngắn gọn, chính xác.',
    'Chỉ dùng công cụ search_products/check_build_compatibility/lookup_my_orders để lấy dữ liệu thực — không tự bịa giá, tồn kho, hoặc kết quả tương thích.',
    'Nếu không đủ dữ liệu để trả lời chắc chắn, hãy nói rõ thay vì suy đoán.',
  ].join(' ');
  return ragContext ? `${base}\n\n${ragContext}` : base;
}
