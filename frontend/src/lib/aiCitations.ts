import type { AiCitation } from '@/types/ai.type';

export type DisplayCitation = {
  key: string;
  sourceNumber: number;
  title: string;
  href: string | null;
  productId: number | null;
  documentIds: string[];
  chunks: AiCitation[];
};
export type CitationReference = {
  originalSourceNumber: number;
  displaySourceNumber: number;
  citation: AiCitation;
};

const POLICY_PAGES: Record<string, string> = {
  warranty: '/policy/warranty', return: '/policy/return', privacy: '/policy/privacy',
  terms: '/policy/terms', payment: '/policy/payment', shipping: '/shipping', about: '/about', guide: '/guide',
};
const positiveId = (id: unknown): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0;
export function citationHref(source: AiCitation): string | null {
  if (source.sourceType === 'product' && positiveId(source.productId) && typeof source.sourceRef === 'string' && /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(source.sourceRef) && !/^\d+$/.test(source.sourceRef)) {
    return `/products/${encodeURIComponent(source.sourceRef)}`;
  }
  return source.sourceType === 'policy_page' && Object.hasOwn(POLICY_PAGES, source.sourceRef) ? POLICY_PAGES[source.sourceRef] : null;
}

// Apply only to prose: code examples and Markdown links are not evidence markers.
const MARKER = /\[(?:Nguồn\s*)?\d+(?:\s*[,;]\s*(?:Nguồn\s*)?\d+)*\](?!\s*\()|\(Nguồn\s*\d+(?:\s*[,;]\s*(?:Nguồn\s*)?\d+)*\)/gi;
function mapProse(text: string, transform: (prose: string) => string): string {
  return text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => index % 2 ? part : transform(part)).join('');
}

// This is a view model only. Never mutate/re-number the API answer or chunk citations:
// RAG Triad must still be able to compare the original answer with its original context.
export function prepareCitationDisplay(reply: string, citations: AiCitation[] = []) {
  if (!Array.isArray(citations)) citations = [];
  const numbers: number[] = [];
  mapProse(reply, prose => prose.replace(MARKER, marker => {
    for (const value of marker.match(/\d+/g) || []) numbers.push(Number(value));
    return marker;
  }));
  const used = new Set(numbers);
  type Entry = { citation: AiCitation; original: number };
  type Group = { entries: Entry[]; productId: number | null; documents: Set<string> };
  const groups: Group[] = [];
  for (const [index, citation] of citations.entries()) {
    if (!citation || typeof citation !== 'object') continue;
    const original = citation.sourceNumber ?? index + 1;
    if (!positiveId(original) || !used.has(original)) continue;
    const productId = positiveId(citation.productId) ? citation.productId : null;
    const documentId = typeof citation.documentId === 'string' ? citation.documentId.trim() : '';
    if (!productId && !documentId) continue;
    // Conflicting explicit product IDs never collapse different capacities/variants.
    const matches = groups.filter(g => (!productId || !g.productId || productId === g.productId) &&
      (productId && productId === g.productId || documentId && g.documents.has(documentId)));
    if (!productId && new Set(matches.map(g => g.productId).filter(Boolean)).size > 1) continue;
    let group = matches[0];
    if (!group) { group = { entries: [], productId, documents: new Set() }; groups.push(group); }
    for (const extra of matches.slice(1)) {
      group.entries.push(...extra.entries);
      for (const doc of extra.documents) group.documents.add(doc);
      group.productId ||= extra.productId;
      groups.splice(groups.indexOf(extra), 1);
    }
    group.productId ||= productId;
    if (documentId) group.documents.add(documentId);
    group.entries.push({ citation, original });
  }
  const byOriginal = new Map<number, Group | null>();
  for (const group of groups) for (const { original } of group.entries) {
    if (byOriginal.has(original) && byOriginal.get(original) !== group) byOriginal.set(original, null);
    else if (!byOriginal.has(original)) byOriginal.set(original, group);
  }
  const ordered: Group[] = [];
  const mapping = new Map<number, number>();
  for (const original of numbers) {
    const group = byOriginal.get(original);
    if (!group) continue; // Missing/ambiguous source numbers must not invent a source.
    if (!ordered.includes(group)) ordered.push(group);
    mapping.set(original, ordered.indexOf(group) + 1);
  }
  const sources: DisplayCitation[] = ordered.map((group, index) => {
    const chunks = group.entries.filter(e => mapping.has(e.original)).map(e => e.citation);
    const addresses = [...new Set(chunks.map(citationHref).filter((href): href is string => !!href))];
    const href = addresses.length === 1 ? addresses[0] : null; // Conflicting slugs: show text, never guess a link.
    const representative = chunks.find(c => href && citationHref(c) === href && c.title) || chunks.find(c => c.title) || chunks[0];
    return { key: group.productId ? `product:${group.productId}` : `document:${[...group.documents][0]}`,
      sourceNumber: index + 1, title: representative.title || representative.sourceRef || representative.documentId,
      href, productId: group.productId, documentIds: [...group.documents], chunks };
  });
  const referenceMap: CitationReference[] = ordered.flatMap((group, index) => group.entries
    .filter(e => mapping.has(e.original)).map(e => ({ originalSourceNumber: e.original, displaySourceNumber: index + 1, citation: e.citation })));
  const text = mapProse(reply, prose => prose.replace(MARKER, marker => [...new Set((marker.match(/\d+/g) || [])
    .map(n => mapping.get(Number(n))).filter((n): n is number => n !== undefined))].map(n => `[Nguồn ${n}]`).join(' '))
    .replace(/(\[Nguồn \d+\])(?:[ \t]*[,;]?[ \t]*\1)+/g, '$1'));
  return { text, sources, referenceMap };
}
