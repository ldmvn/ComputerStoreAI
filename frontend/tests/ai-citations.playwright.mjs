// Real frontend/browser with a mocked chat response; no Gemini calls or database writes.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const out = fileURLToPath(new URL('../../backend/reports/citation-display/', import.meta.url));
await mkdir(out, { recursive: true });
const corpus = JSON.parse(await readFile(new URL('../../backend/tests/fixtures/rag-phase3-corpus.json', import.meta.url), 'utf8'));
function citation(number, productId, chunkIndex) {
  const original = corpus.find(c => c.id === `product:${productId}::chunk-${chunkIndex}`);
  assert.ok(original);
  return { ...original.metadata, documentId: `product:${productId}`, chunkId: original.id, sourceNumber: number, score: .057 };
}
const citations = [citation(2, 244, 0), citation(4, 244, 3), citation(6, 249, 0), citation(8, 245, 0)];
const reply = '**WD_BLACK SN850X 1TB** có tốc độ đọc 7.300 MB/s [Nguồn 2], hỗ trợ DirectStorage [Nguồn 4]. **Samsung 990 Pro 1TB** đọc đến 7.450 MB/s [Nguồn 6].';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const measurements = [], pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.route('**/api/content/store-info', route => route.fulfill({ json: { success: true, data: { 'widget.ai.enabled': 'true' } } }));
await page.route('**/api/ai/status', route => route.fulfill({ json: { success: true, data: { enabled: true, chatAvailable: true, ragAvailable: true, buildPcAvailable: false } } }));
let sent = 0;
await page.route('**/api/ai/chat', async route => {
  const body = route.request().postDataJSON();
  sent++;
  await route.fulfill({ json: { success: true, data: { conversationId: body.conversationId, reply: sent === 1 ? reply : 'Mình có thể hỗ trợ thêm thông tin nào?', citations, toolCalls: [] } } });
});
async function send(text) {
  const input = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Chatbot AI' });
  await page.waitForFunction(() => !document.querySelector('textarea[aria-label="Nhập tin nhắn cho Chatbot AI"]')?.disabled);
  await input.fill(text);
  const response = page.waitForResponse(r => r.url().includes('/api/ai/chat') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await response;
  await page.waitForFunction(() => !document.querySelector('textarea[aria-label="Nhập tin nhắn cho Chatbot AI"]')?.disabled);
}
try {
  await page.goto(process.env.TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: 'Mở liên hệ hỗ trợ', exact: true }).click();
  await page.getByRole('dialog', { name: 'Liên hệ hỗ trợ', exact: true }).getByRole('button', { name: /Chatbot AI/ }).click();
  await send('So sánh WD_BLACK SN850X 1TB và Samsung 990 Pro 1TB');
  const dialog = page.getByRole('dialog', { name: 'Chatbot AI', exact: true });
  const details = dialog.locator('details');
  const summary = details.locator('summary');
  assert.equal(await summary.innerText(), 'Nguồn tham khảo (2)');
  assert.equal(await details.evaluate(el => el.open), false);
  assert.equal(await details.getByRole('list').isVisible(), false);
  const inline = await dialog.locator('.ai-reply-content').innerText();
  assert.equal(inline, 'WD_BLACK SN850X 1TB có tốc độ đọc 7.300 MB/s [Nguồn 1], hỗ trợ DirectStorage [Nguồn 1]. Samsung 990 Pro 1TB đọc đến 7.450 MB/s [Nguồn 2].');
  await page.screenshot({ path: join(out, 'desktop-collapsed.png') });
  await summary.focus(); await page.keyboard.press('Enter');
  assert.equal(await details.evaluate(el => el.open), true);
  const links = details.getByRole('link');
  assert.equal(await links.count(), 2);
  assert.equal(await links.nth(0).getAttribute('href'), '/products/seed-ssdm2-003');
  assert.equal(await links.nth(1).getAttribute('href'), '/products/seed-ssdm2-008');
  assert.ok((await links.nth(0).innerText()).includes('SN850X 1TB'));
  assert.ok(!(await details.innerText()).includes('SN850X 2TB'));
  // Verify that the href is the real detail route, not an invented source destination.
  const productPage = await page.context().newPage();
  await productPage.goto(new URL('/products/seed-ssdm2-003', page.url()).href, { waitUntil: 'domcontentloaded' });
  await productPage.getByRole('heading', { name: /WD Black SN850X 1TB/i }).first().waitFor();
  await productPage.close();
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 320, 740]]) {
    await page.setViewportSize({ width, height });
    await details.scrollIntoViewIfNeeded();
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
    assert.ok(await details.evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.screenshot({ path: join(out, `${name}-expanded.png`) });
    measurements.push({ name, width, height, box, sources: await links.count(), noHorizontalOverflow: true });
  }
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('ducmanh_chat_guest');
    return raw ? JSON.parse(raw).messages.find(m => m.role === 'assistant' && m.status === 'sent') : null;
  });
  assert.equal(saved.content, reply);
  assert.deepEqual(saved.citations.map(c => [c.sourceNumber, c.chunkId, c.documentId, c.score, c.updatedAt]), citations.map(c => [c.sourceNumber, c.chunkId, c.documentId, c.score, c.updatedAt]));
  await summary.focus(); await page.keyboard.press('Enter');
  assert.equal(await details.evaluate(el => el.open), false);
  await send('Cảm ơn');
  assert.equal(await dialog.locator('details').count(), 1); // unused metadata cannot create another sources drawer
  assert.deepEqual(pageErrors, []);
  await writeFile(join(out, 'browser.json'), JSON.stringify({ mode: 'real Edge/Next frontend; mocked chat API; 0 Gemini calls', measurements,
    defaultClosed: true, inlineRenumbering: inline, productHrefs: ['/products/seed-ssdm2-003', '/products/seed-ssdm2-008'],
    realProductPageVerified: true, originalChunkMetadataPreservedInHistory: true, pageErrors }, null, 2));
  console.log('PASS: collapsed/deduplicated sources, inline mapping, keyboard, real product link, history metadata, unused sources, Desktop/Tablet/Mobile.');
} finally { await browser.close(); }
