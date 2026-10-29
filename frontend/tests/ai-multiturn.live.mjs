// Opt-in real browser + real API/Gemini smoke test. Automatic regressions use SDK mocks.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
if (!process.argv.includes('--live')) throw new Error('Use --live explicitly; this test consumes Gemini quota.');
const out = fileURLToPath(new URL('../../backend/reports/multiturn-fix/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const records = [], responsive = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
async function openChat() {
  await page.getByRole('button', { name: 'Mở liên hệ hỗ trợ', exact: true }).click();
  await page.getByRole('dialog', { name: 'Liên hệ hỗ trợ', exact: true }).getByRole('button', { name: /Chatbot AI/ }).click();
  await page.getByRole('dialog', { name: 'Chatbot AI', exact: true }).waitFor();
}
async function send(message) {
  const input = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Chatbot AI' });
  await input.waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('textarea[aria-label="Nhập tin nhắn cho Chatbot AI"]')?.disabled);
  await input.fill(message);
  const pending = page.waitForResponse(r => r.url().includes('/ai/chat') && r.request().method() === 'POST', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  const response = await pending;
  const payload = await response.json();
  const row = { message, request: response.request().postDataJSON(), status: response.status(), payload };
  records.push(row); console.log(JSON.stringify(row));
  assert.equal(response.status(), 200, JSON.stringify(payload));
  await page.waitForFunction(() => !document.querySelector('textarea[aria-label="Nhập tin nhắn cho Chatbot AI"]')?.disabled);
  return payload.data;
}
try {
  await page.goto(process.env.TEST_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await openChat();
  const a = await send('WD_BLACK SN850X 1TB có những công nghệ nổi bật nào?');
  const b = await send('Nó có phù hợp chơi game không?');
  const c = await send('So sánh nó với Samsung 990 Pro.');
  assert.equal(a.conversationId, b.conversationId); assert.equal(b.conversationId, c.conversationId);
  assert.ok(records.slice(0, 3).every(r => r.request.conversationId === a.conversationId));
  for (const answer of [a, b]) {
    assert.ok(answer.citations.length > 0);
    assert.ok(answer.citations.every(s => s.productId === 244 && /1TB/.test(s.title)));
  }
  assert.deepEqual([...new Set(c.citations.map(s => s.productId))].sort(), [244, 249]);
  assert.equal(b._context.rewrittenQuery, 'WD_BLACK SN850X 1TB có phù hợp chơi game không?');
  assert.equal(c._context.rewrittenQuery, 'So sánh WD_BLACK SN850X 1TB với Samsung 990 Pro.');
  assert.ok(!/980\s*Pro/i.test(c.reply));
  assert.ok(!/^(?:xin\s+)?chào/i.test(b.reply.trim()) && !/^(?:xin\s+)?chào/i.test(c.reply.trim()));
  assert.ok(!/cung cấp.*tên|sản phẩm cụ thể nào/i.test(b.reply));
  await page.getByRole('dialog', { name: 'Chatbot AI', exact: true }).getByRole('button', { name: 'Đóng', exact: true }).click();
  await openChat();
  const reopened = await send('Con đầu có phù hợp chơi game không?');
  assert.equal(reopened.conversationId, a.conversationId);
  assert.ok(reopened.citations.length > 0 && reopened.citations.every(s => s.productId === 244));
  assert.ok(!/^(?:xin\s+)?chào/i.test(reopened.reply.trim()));
  const sku = await send('Thông số SEED-SSDM2-004');
  assert.equal(sku.conversationId, a.conversationId);
  assert.ok(sku.citations.length > 0 && sku.citations.every(s => s.productId === 245 && /2TB/.test(s.title)));
  assert.ok(!/^(?:xin\s+)?chào/i.test(sku.reply.trim()));
  const topic = await send('Đổi chủ đề: thời tiết Hà Nội hôm nay thế nào?');
  assert.deepEqual(topic._context.products, []);
  const afterTopic = await send('Sản phẩm đó có phù hợp chơi game không?');
  assert.match(afterTopic.reply, /sản phẩm nào/); assert.equal(afterTopic._metrics.geminiCalls, 0);
  await page.getByRole('button', { name: 'Cuộc trò chuyện mới', exact: true }).click();
  const fresh = await send('Nó có phù hợp chơi game không?');
  assert.notEqual(fresh.conversationId, a.conversationId);
  assert.equal(fresh._context.priorTurns, 0); assert.equal(fresh._metrics.geminiCalls, 0);
  for (const [name, width, height] of [['mobile', 320, 740], ['tablet', 768, 1024], ['desktop', 1440, 1000]]) {
    await page.setViewportSize({ width, height });
    const dialog = page.getByRole('dialog', { name: 'Chatbot AI', exact: true });
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
    await page.screenshot({ path: join(out, `${name}.png`) });
    responsive.push({ name, width, height, box, noHorizontalOverflow: true });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: live browser multi-turn, product scope, close/reopen, SKU, topic reset, new conversation, responsive.');
} finally {
  await writeFile(join(out, 'live-after.json'), JSON.stringify({ mode: 'real Edge browser → Next frontend → Express backend → real Gemini', records, responsive, pageErrors: errors }, null, 2));
  await browser.close();
}
