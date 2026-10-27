// RAG orchestrator — wires loader → chunker → embedding → vector store →
// retriever → context builder into the two operations the rest of the AI
// module needs: ingest a source, and answer a query with grounded context.
//
// With the default config (RAG_ENABLED=false, no embedding/vector-store
// provider chosen) every exported function here throws a clear 501 instead
// of doing partial, silently-wrong work — ingesting without real embeddings
// would corrupt an index, and querying without one would return nothing
// while looking like it succeeded.

import { isRagConfigured } from '../config/ai.config.js';
import { loadPolicyPageDocuments } from './loaders/documentLoader.js';
import { chunkDocument } from './chunking/textChunker.js';
import { NullEmbeddingProvider } from './embeddings/embedding.interface.js';
import { InMemoryVectorStore } from './vectorstores/vectorStore.interface.js';
import { Retriever } from './retrieval/retriever.interface.js';
import { buildContext } from './context/contextBuilder.js';

// Process-local singletons. Swapping NullEmbeddingProvider/InMemoryVectorStore
// for real adapters (once configured) only means changing these two lines —
// everything that calls ragService below stays the same.
const embeddingProvider = new NullEmbeddingProvider();
const vectorStore = new InMemoryVectorStore();
const retriever = new Retriever({ embeddingProvider, vectorStore });

function ragNotConfiguredError() {
  const error = new Error('RAG chưa được cấu hình (cần RAG_ENABLED=true, VECTOR_STORE_PROVIDER và EMBEDDING_PROVIDER hợp lệ).');
  error.statusCode = 501;
  error.code = 'RAG_NOT_CONFIGURED';
  return error;
}

/**
 * Loads Policy Page documents and chunks them — the real, working part of
 * ingestion. Embedding/indexing those chunks requires a configured provider
 * and is where this currently stops (by design, per task scope).
 * @returns {Promise<{ documents: number, chunks: ReturnType<typeof chunkDocument> }>}
 */
export async function prepareChunksForPolicyPages() {
  const documents = await loadPolicyPageDocuments();
  const chunks = documents.flatMap(doc => chunkDocument(doc));
  return { documents: documents.length, chunks };
}

/**
 * Full ingest: chunk → embed → upsert. Requires a real embedding provider,
 * so with the current NullEmbeddingProvider this always throws 501 — that is
 * the correct behavior, not a bug, until an operator configures one.
 * @returns {Promise<{ documents: number, chunksIndexed: number }>}
 */
export async function ingestPolicyPages() {
  if (!isRagConfigured()) throw ragNotConfiguredError();
  const { documents, chunks } = await prepareChunksForPolicyPages();
  const vectors = await embeddingProvider.embed(chunks.map(c => c.content));
  await vectorStore.upsert(chunks.map((chunk, i) => ({ id: chunk.id, vector: vectors[i], content: chunk.content, metadata: { ...chunk.metadata, documentId: chunk.documentId } })));
  return { documents, chunksIndexed: chunks.length };
}

/**
 * Retrieves grounded context for a user query. Used by aiChat.service once a
 * chat provider exists; throws 501 until RAG is configured so a caller never
 * silently gets an empty context and mistakes it for "no relevant sources".
 * @param {{ query: string, topK?: number, filter?: Record<string, unknown> }} params
 * @returns {Promise<ReturnType<typeof buildContext>>}
 */
export async function queryRag({ query, topK = 5, filter } = {}) {
  if (!isRagConfigured()) throw ragNotConfiguredError();
  const chunks = await retriever.retrieve({ query, topK, filter });
  return buildContext(chunks);
}

// Exposed for health/debug tooling and tests — never on a public route.
export async function getIndexedChunkCount() {
  return vectorStore.count();
}
