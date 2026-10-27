// Document Loading stage of the RAG pipeline. Turns raw sources (today:
// Policy Pages already stored via the existing Content Pages feature;
// future: product descriptions, spec sheets, user manuals) into the plain
// `RagDocument` shape chunking/embedding/indexing consume.
//
// This stage never calls an LLM or embedding API — it only reads from MySQL
// and strips markup. The policy-page loader below is real and already works
// end to end against the Prisma model the Dashboard's Content Pages editor
// writes to (see backend/src/controllers/contentPage.controller.js).

import { prisma } from '../../../config/prisma.js';

/**
 * @typedef {Object} RagDocument
 * @property {string} id            - stable id, e.g. "policy:warranty"
 * @property {string} sourceType    - 'policy_page' | 'product_description' | 'product_spec' | 'faq' | 'manual'
 * @property {string} sourceRef     - natural key for the source row, e.g. a pageKey or product slug
 * @property {string} [title]
 * @property {string} content       - plain text, HTML already stripped
 * @property {number|null} productId
 * @property {string} updatedAt     - ISO timestamp, used to detect stale index entries
 */

// Minimal, dependency-free HTML→text: strips tags, decodes the handful of
// entities sanitize-html actually emits for this content, collapses whitespace.
// Good enough for chunking/embedding; not a general-purpose HTML renderer.
function htmlToPlainText(html) {
  return String(html ?? '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Loads every published Policy Page (warranty, return, shipping, FAQ page, …)
 * as RagDocuments. This is the one real, working document source wired up in
 * this phase — everything else (product descriptions, manuals) is prepared
 * as a contract (see ingestProductDescriptions below) but not ingested yet.
 * @returns {Promise<RagDocument[]>}
 */
export async function loadPolicyPageDocuments() {
  const pages = await prisma.policyPage.findMany();
  return pages
    .filter(page => page.contentHtml?.trim())
    .map(page => ({
      id: `policy:${page.pageKey}`,
      sourceType: 'policy_page',
      sourceRef: page.pageKey,
      title: page.title,
      content: htmlToPlainText(page.contentHtml),
      productId: null,
      updatedAt: page.updatedAt.toISOString(),
    }));
}

/**
 * Contract for a future product-description/spec-sheet source. Deliberately
 * NOT implemented yet (task scope: don't ingest from every source now) — it
 * exists so rag.service.js's ingestion list has one real entry point to add
 * without redesigning the loader contract. Calling it tells the caller so,
 * loudly, instead of silently returning an empty array that could be
 * mistaken for "no products exist".
 * @returns {Promise<RagDocument[]>}
 */
export async function loadProductDescriptionDocuments() {
  throw new Error('loadProductDescriptionDocuments is not implemented yet — product descriptions are not ingested into RAG in this phase.');
}
