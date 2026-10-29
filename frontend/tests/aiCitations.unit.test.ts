import test from 'node:test';
import assert from 'node:assert/strict';
import { citationHref, prepareCitationDisplay } from '../src/lib/aiCitations';
import { saveSession, loadSession, clearAllSessions } from '../src/lib/chatHistory';
import type { AiCitation, ChatMessage } from '../src/types/ai.type';

function chunk(sourceNumber: number, productId: number | null = 244, extra: Partial<AiCitation> = {}): AiCitation {
  return { sourceNumber, chunkId: `product:${productId}::chunk-${sourceNumber}`, documentId: `product:${productId}`,
    sourceType: 'product', sourceRef: `seed-ssdm2-${productId}`, title: `SSD ${productId}`, productId, score: .057,
    sku: `SKU-${productId}`, updatedAt: '2026-10-27T00:00:00Z', ...extra };
}
test('collapse product chunks across documents while retaining exact original references for RAG Triad', () => {
  const citations = [chunk(2), chunk(4, 244, { documentId: 'manual:244' }), chunk(6, 249), chunk(7, 888)];
  const result = prepareCitationDisplay('WD [Nguồn 2] và [Nguồn 4]. Samsung [Nguồn 6].', citations);
  assert.equal(result.sources.length, 2);
  assert.equal(result.text, 'WD [Nguồn 1] và [Nguồn 1]. Samsung [Nguồn 2].');
  assert.deepEqual(result.sources[0].chunks, citations.slice(0, 2));
  assert.deepEqual(result.sources[0].documentIds, ['product:244', 'manual:244']);
  assert.deepEqual(result.referenceMap.map(m => [m.originalSourceNumber, m.displaySourceNumber, m.citation.chunkId, m.citation.score]),
    [[2, 1, citations[0].chunkId, .057], [4, 1, citations[1].chunkId, .057], [6, 2, citations[2].chunkId, .057]]);
  assert.ok(result.sources.every(s => s.productId !== 888));
});
test('policy chunks deduplicate by documentId and link to the existing policy page', () => {
  const citations = [1, 3].map(n => chunk(n, null, { documentId: 'policy:warranty', sourceType: 'policy_page', sourceRef: 'warranty', title: 'Chính sách bảo hành' }));
  const result = prepareCitationDisplay('Bảo hành [Nguồn 1, Nguồn 3].', citations);
  assert.equal(result.text, 'Bảo hành [Nguồn 1].');
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].href, '/policy/warranty');
  assert.equal(result.sources[0].chunks.length, 2);
});
test('transitive product/document aliases merge without dropping chunk mappings', () => {
  const citations = [chunk(1, 244, { documentId: 'spec:244' }), chunk(2, null, { documentId: 'manual:244', sourceType: 'manual' }), chunk(3, 244, { documentId: 'manual:244' })];
  const result = prepareCitationDisplay('[Nguồn 1, 2, 3]', citations);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].chunks.length, 3);
  assert.equal(result.referenceMap.length, 3);
});
test('different product IDs and capacities never collapse through contradictory document metadata', () => {
  const citations = [chunk(1, 244, { documentId: 'conflict', title: 'SN850X 1TB' }), chunk(2, 245, { documentId: 'conflict', title: 'SN850X 2TB' }), chunk(3, null, { documentId: 'conflict' })];
  const result = prepareCitationDisplay('[Nguồn 1, 2, 3]', citations);
  assert.equal(result.sources.length, 2);
  assert.deepEqual(result.sources.map(s => s.productId), [244, 245]);
  assert.ok(!result.referenceMap.some(m => m.originalSourceNumber === 3));
});
test('renumber by first appearance with no replacement cascade and close source-number gaps', () => {
  const result = prepareCitationDisplay('Samsung [6]. WD [2]. Samsung [6].', [chunk(2), chunk(6, 249)]);
  assert.equal(result.text, 'Samsung [Nguồn 1]. WD [Nguồn 2]. Samsung [Nguồn 1].');
  assert.deepEqual(result.sources.map(s => s.productId), [249, 244]);
});
test('normalize citation groups and adjacent duplicate inline markers', () => {
  const result = prepareCitationDisplay('A [Nguồn 2] [Nguồn 4]. B (Nguồn 2, 4, 6).', [chunk(2), chunk(4), chunk(6, 249)]);
  assert.equal(result.text, 'A [Nguồn 1]. B [Nguồn 1] [Nguồn 2].');
});
test('only referenced real citations are shown; missing and ambiguous numbers create no source', () => {
  assert.deepEqual(prepareCitationDisplay('Không có nguồn.', [chunk(1)]).sources, []);
  assert.equal(prepareCitationDisplay('Thông tin [Nguồn 99].', [chunk(1)]).text, 'Thông tin .');
  assert.deepEqual(prepareCitationDisplay('[Nguồn 1]', [chunk(1), chunk(1, 249)]).sources, []);
  assert.deepEqual(prepareCitationDisplay('[Nguồn 1]', [chunk(1, null, { documentId: '' })]).sources, []);
});
test('code examples and Markdown links are not counted or rewritten as citations', () => {
  const text = '`[Nguồn 1]`\n```\n[1]\n```\n[1](https://example.com)';
  const result = prepareCitationDisplay(text, [chunk(1)]);
  assert.equal(result.text, text);
  assert.deepEqual(result.sources, []);
});
test('product links use the exact source slug, policies use a whitelist, unsafe/unknown refs stay unlinked', () => {
  assert.equal(citationHref(chunk(1, 244, { sourceRef: 'seed-ssdm2-003' })), '/products/seed-ssdm2-003');
  for (const ref of ['https://evil.example/x', 'javascript:alert(1)', '../checkout', '123', '', 'has spaces']) assert.equal(citationHref(chunk(1, 244, { sourceRef: ref })), null);
  assert.equal(citationHref(chunk(1, null, { sourceType: 'policy_page', sourceRef: 'shipping' })), '/shipping');
  assert.equal(citationHref(chunk(1, null, { sourceType: 'policy_page', sourceRef: '__proto__' })), null);
  assert.equal(citationHref(chunk(1, null, { sourceType: 'manual', sourceRef: 'unknown' })), null);
  assert.equal(citationHref(chunk(1, 244, { sourceRef: undefined })), null);
});
test('conflicting slugs in one product do not guess a destination', () => {
  const result = prepareCitationDisplay('[Nguồn 1, 2]', [chunk(1, 244, { sourceRef: 'old-slug' }), chunk(2, 244, { sourceRef: 'new-slug' })]);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].href, null);
});
test('display projection leaves original answer and all chunk metadata unchanged', () => {
  const citations = Object.freeze([Object.freeze(chunk(3)), Object.freeze(chunk(8))]);
  const before = JSON.stringify(citations);
  const reply = 'Hiệu năng [Nguồn 3] [Nguồn 8].';
  const result = prepareCitationDisplay(reply, citations as unknown as AiCitation[]);
  assert.equal(JSON.stringify(citations), before);
  assert.equal(result.referenceMap[0].citation, citations[0]);
  assert.equal(result.sources[0].chunks[1].sku, 'SKU-244');
  assert.equal(result.sources[0].chunks[1].updatedAt, '2026-10-27T00:00:00Z');
  assert.equal(reply, 'Hiệu năng [Nguồn 3] [Nguồn 8].');
});
test('chat history retains chunk-level provenance across reload without persisting the display renumbering', t => {
  const data = new Map<string, string>();
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) } });
  t.after(() => { if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'SSD [Nguồn 4] [Nguồn 8].', status: 'sent', createdAt: Date.now(), citations: [chunk(4), chunk(8)] };
  saveSession(7, 'conversation-7', [message]);
  const restored = loadSession(7)!;
  assert.equal(restored.messages[0].content, message.content);
  assert.deepEqual(restored.messages[0].citations, message.citations);
  const display = prepareCitationDisplay(restored.messages[0].content, restored.messages[0].citations);
  assert.equal(display.sources.length, 1);
  assert.deepEqual(display.referenceMap.map(m => m.originalSourceNumber), [4, 8]);
  clearAllSessions();
});
