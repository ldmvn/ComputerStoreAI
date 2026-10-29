const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const sharp = require('../../backend/node_modules/sharp');
require('../../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

// Uses the real API, database, multipart middleware, storage and Next media proxy.
// Only this run's user and banner are created/removed; existing banners stay intact.
(async () => {
  const { prisma } = await import('../../backend/src/config/prisma.js');
  const { createAccessToken } = await import('../../backend/src/services/token.service.js');
  const { removeBannerMedia } = await import('../../backend/src/services/media.service.js');
  const base = process.env.TEST_URL || 'http://localhost:3000';
  const api = process.env.BANNER_TEST_API || 'http://127.0.0.1:5000/api';
  const marker = `banner-upload-${randomUUID()}`;
  let user, banner, browser;
  const errors = [];
  try {
    const makeImage = (format, color) => sharp({ create: { width: 800, height: 350, channels: 3, background: color } })[format]().toBuffer();
    const png = await makeImage('png', '#f97316');
    const jpg = await makeImage('jpeg', '#22c55e');
    const webp = await makeImage('webp', '#3b82f6');
    user = await prisma.user.create({ data: { fullName: marker, email: `${marker}@example.com`, phone: marker, passwordHash: 'unused-test-password', role: 'ADMIN' } });
    const token = createAccessToken(user);
    const form = new FormData();
    for (const [key, value] of Object.entries({ name: marker, group: 'MAIN', position: 'MAIN_HERO', mediaType: 'IMAGE', sortOrder: 999999, autoplayInterval: 60000, isActive: true })) form.set(key, String(value));
    form.set('media', new Blob([png], { type: 'image/png' }), 'original.png');
    const created = await fetch(`${api}/admin/banners`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    const result = await created.json();
    assert.equal(created.status, 201, JSON.stringify(result));
    banner = result.banner;
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
    const context = await browser.newContext();
    await context.addCookies([{ name: 'accessToken', value: token, url: base, httpOnly: true }]);
    await context.addInitScript(() => {
      window.bannerUploadProbe = { created: [], revoked: [], uploads: [] };
      const create = URL.createObjectURL.bind(URL);
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = file => {
        const url = create(file);
        window.bannerUploadProbe.created.push({ url, isFile: file instanceof File, name: file.name, type: file.type, size: file.size });
        return url;
      };
      URL.revokeObjectURL = url => { window.bannerUploadProbe.revoked.push(url); revoke(url); };
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (url, options) => {
        if (/\/admin\/banners\/\d+$/.test(String(url)) && options?.body instanceof FormData) {
          const file = options.body.get('media');
          const bytes = file instanceof File ? await file.arrayBuffer() : null;
          const digest = bytes ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(value => value.toString(16).padStart(2, '0')).join('') : null;
          window.bannerUploadProbe.uploads.push({ isFile: file instanceof File, name: file?.name, type: file?.type, size: file?.size, digest });
        }
        return originalFetch(url, options);
      };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/admin/banners`);
    const row = () => page.locator(`[data-banner-id="${banner.id}"]`);
    const dialog = () => page.getByRole('dialog');
    const input = () => dialog().locator('input[type=file]');
    const preview = () => dialog().locator('[data-banner-form-preview] img:not([aria-hidden])');
    const probe = () => page.evaluate(() => window.bannerUploadProbe);
    async function open() { await row().getByTitle('Chỉnh sửa banner', { exact: true }).click(); await dialog().waitFor(); }
    async function close() { await dialog().getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click(); await dialog().waitFor({ state: 'detached' }); }
    async function loaded() {
      await page.waitForFunction(() => {
        const img = document.querySelector('[data-banner-form-preview] img:not([aria-hidden])');
        return img?.complete && img.naturalWidth === 800;
      });
    }
    async function select(name, mimeType, buffer) {
      await input().setInputFiles({ name, mimeType, buffer });
      await loaded();
      const src = await preview().getAttribute('src');
      assert.ok(src.startsWith('blob:'), src);
      const state = await probe();
      assert.ok(!state.revoked.includes(src), 'Active preview URL is still readable');
      assert.deepEqual(state.created.at(-1), { url: src, isFile: true, name, type: mimeType, size: buffer.length });
      return src;
    }
    async function save(expected) {
      const responsePromise = page.waitForResponse(response => response.url().endsWith(`/admin/banners/${banner.id}`) && response.request().method() === 'PUT');
      await dialog().getByRole('button', { name: 'Cập nhật banner', exact: true }).click();
      const response = await responsePromise;
      const data = await response.json();
      assert.equal(response.status(), 200, JSON.stringify(data));
      assert.match(response.request().headers()['content-type'], /^multipart\/form-data; boundary=/);
      const upload = (await probe()).uploads.at(-1);
      if (expected) {
        assert.deepEqual(upload, { isFile: true, name: expected.name, type: expected.mimeType, size: expected.buffer.length, digest: createHash('sha256').update(expected.buffer).digest('hex') });
        assert.notEqual(data.banner.mediaUrl, banner.mediaUrl);
      } else {
        assert.equal(upload.isFile, false, 'Metadata-only edit has no file part');
        assert.equal(data.banner.mediaUrl, banner.mediaUrl);
      }
      banner = data.banner;
      await dialog().waitFor({ state: 'detached' });
      const stored = await prisma.banner.findUnique({ where: { id: banner.id } });
      assert.equal(stored.mediaUrl, banner.mediaUrl);
      const media = await context.request.get(new URL(banner.mediaUrl, base).href);
      assert.equal(media.status(), 200, 'Media is served through the Next proxy');
      assert.match(media.headers()['content-type'], /^image\/webp/);
      assert.equal((await sharp(await media.body()).metadata()).width, 800);
      await page.reload();
      await row().waitFor();
      await row().scrollIntoViewIfNeeded();
      await page.waitForFunction(id => {
        const img = document.querySelector(`[data-banner-id="${id}"] img:not([aria-hidden])`);
        return img?.complete && img.naturalWidth === 800;
      }, banner.id);
      assert.ok((await row().locator('img:not([aria-hidden])').getAttribute('src')).endsWith(banner.mediaUrl));
    }

    await open();
    await loaded();
    await save();
    console.log('PASS: edit without a new file preserves stored media, including reload');

    for (const fixture of [
      { name: 'replacement.jpg', mimeType: 'image/jpeg', buffer: jpg },
      { name: 'replacement.png', mimeType: 'image/png', buffer: png },
      { name: 'replacement.webp', mimeType: 'image/webp', buffer: webp },
      { name: 'a9f837c1', mimeType: 'image/png', buffer: png },
      { name: 'renamed.jpg', mimeType: 'image/webp', buffer: webp },
      { name: 'limit.png', mimeType: 'image/png', buffer: Buffer.concat([png, Buffer.alloc(10 * 1024 * 1024 - png.length)]) },
    ]) {
      await open();
      await select(fixture.name, fixture.mimeType, fixture.buffer);
      await save(fixture);
      console.log(`PASS: ${fixture.name} (${fixture.mimeType}) preview, exact File bytes in multipart, real upload/storage and Admin reload`);
    }

    await open();
    const a = await select('a.png', 'image/png', png);
    const b = await select('b.webp', 'image/webp', webp);
    assert.ok((await probe()).revoked.includes(a));
    assert.notEqual(a, b);
    await save({ name: 'b.webp', mimeType: 'image/webp', buffer: webp });
    console.log('PASS: selecting A then B previews and uploads B');

    await open();
    const discarded = await select('discarded.png', 'image/png', png);
    await close();
    assert.ok((await probe()).revoked.includes(discarded));
    await open();
    assert.equal(await input().evaluate(el => el.files.length), 0);
    assert.ok(!(await preview().getAttribute('src')).startsWith('blob:'));
    await save();
    console.log('PASS: close/reopen revokes object URL and clears selected File');

    await open();
    for (const [name, mimeType, buffer, message] of [
      ['huge.png', 'image/png', Buffer.alloc(10 * 1024 * 1024 + 1), 'Ảnh tối đa 10 MB.'],
      ['document.pdf', 'application/pdf', Buffer.from('%PDF-1.7'), 'Định dạng'],
      ['text.txt', 'text/plain', Buffer.from('text'), 'Định dạng'],
      ['empty.png', 'image/png', Buffer.alloc(0), 'rỗng'],
    ]) {
      const before = (await probe()).uploads.length;
      await input().setInputFiles({ name, mimeType, buffer });
      await dialog().getByRole('alert').filter({ hasText: message }).waitFor();
      await dialog().getByRole('button', { name: 'Cập nhật banner', exact: true }).click();
      await dialog().getByRole('alert').filter({ hasText: message }).waitFor();
      assert.equal((await probe()).uploads.length, before, 'Rejected file cannot be submitted');
    }
    await input().setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await dialog().getByRole('alert').filter({ hasText: 'Không thể đọc media' }).waitFor();
    const before = (await probe()).uploads.length;
    await dialog().getByRole('button', { name: 'Cập nhật banner', exact: true }).click();
    assert.equal((await probe()).uploads.length, before);
    await select('recovered.jpg', 'image/jpeg', jpg);
    assert.equal(await dialog().getByRole('alert').count(), 0, 'Valid selection clears previous decode error');
    await save({ name: 'recovered.jpg', mimeType: 'image/jpeg', buffer: jpg });
    console.log('PASS: oversized, PDF/TXT, empty and unreadable files show distinct errors; valid selection recovers');

    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await open();
      await select('responsive.png', 'image/png', png);
      const box = await dialog().boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 900);
      assert.ok(await dialog().evaluate(el => el.scrollWidth <= el.clientWidth));
      const button = await dialog().getByRole('button', { name: 'Cập nhật banner', exact: true }).boundingBox();
      assert.ok(button.x >= 0 && button.x + button.width <= width && button.y + button.height <= 900);
      await close();
      assert.deepEqual(await page.evaluate(() => {
        const { created, revoked } = window.bannerUploadProbe;
        return created.filter(item => !revoked.includes(item.url));
      }), [], 'All object URLs released after modal closes');
      console.log(`PASS: ${width}px modal, preview, visible submit and URL cleanup`);
    }

    const storefront = await context.newPage();
    storefront.on('pageerror', error => errors.push(error.message));
    const responsePromise = storefront.waitForResponse('**/banners/home');
    await storefront.goto(`${base}/`);
    const home = await (await responsePromise).json();
    const index = home.mainHero.findIndex(item => item.id === banner.id);
    assert.ok(index >= 0);
    assert.equal(home.mainHero[index].mediaUrl, banner.mediaUrl);
    if (home.mainHero.length > 1) await storefront.locator('[data-banner-position="MAIN_HERO"]').getByRole('button', { name: new RegExp(`chọn banner ${index + 1}$`) }).click();
    await storefront.waitForFunction(url => [...document.querySelectorAll('[data-banner-position="MAIN_HERO"] img')].some(img => img.src.endsWith(url) && img.complete && img.naturalWidth === 800), banner.mediaUrl);
    console.log('PASS: storefront renders the persisted replacement from the real public API');
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    if (banner) {
      const stored = await prisma.banner.findUnique({ where: { id: banner.id } });
      if (stored) { await prisma.banner.delete({ where: { id: stored.id } }); await removeBannerMedia(stored.mediaKey); }
    }
    if (user) await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
