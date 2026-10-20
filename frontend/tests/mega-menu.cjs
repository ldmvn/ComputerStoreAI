const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://localhost:3000';
const backend = path.resolve(__dirname, '../../backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env') });

(async () => {
  const { prisma } = await import(pathToFileURL(path.join(backend, 'src/config/prisma.js')));
  const { createAccessToken } = await import(pathToFileURL(path.join(backend, 'src/services/token.service.js')));
  const marker = `mega-ui-${randomUUID().slice(0, 8)}`;
  const ids = { users: [], categories: [], products: [], brands: [] };
  let browser;
  try {
    const admin = await prisma.user.create({ data: { fullName: marker, email: `${marker}@example.com`, passwordHash: 'integration-only', role: 'ADMIN' } }); ids.users.push(admin.id);
    const category = await prisma.category.create({ data: { name: `${marker} Laptop`, slug: `${marker}-laptop`, icon: 'Laptop', sortOrder: 0 } }); ids.categories.push(category.id);
    const brands = [];
    for (const name of ['Acer', 'ASUS']) {
      let brand = await prisma.brand.findFirst({ where: { name, isActive: true } });
      if (!brand) { brand = await prisma.brand.create({ data: { name: `${marker} ${name}`, slug: `${marker}-${name.toLowerCase()}` } }); ids.brands.push(brand.id); }
      brands.push(brand);
    }
    const count = await prisma.brand.count();
    for (const [index, price] of [14000000, 17000000].entries()) {
      const product = await prisma.product.create({ data: { name: `${marker} Product ${index}`, slug: `${marker}-product-${index}`, sku: `${marker}-${index}`, categoryId: category.id, brandId: brands[index].id, price, stockQuantity: 1, specifications: { create: { name: 'RAM', value: index ? '8GB' : '16GB' } } } }); ids.products.push(product.id);
    }
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const token = createAccessToken(admin);
    await context.addInitScript(token => localStorage.setItem('accessToken', token), token);
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.status() >= 400) console.error('HTTP', response.status(), response.url()); });
    page.setDefaultTimeout(15000);
    await page.goto(`${base}/admin/mega-menu`);
    await page.getByLabel('Danh mục cấp chính').selectOption(String(category.id));
    await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm nhóm', exact: true }).waitFor();
    async function group(title, order) {
      await page.getByRole('button', { name: 'Thêm nhóm', exact: true }).click();
      const modal = page.getByRole('dialog');
      await modal.getByLabel('Tên nhóm').fill(title);
      await modal.getByLabel('Thứ tự nhóm').fill(String(order));
      await modal.getByRole('button', { name: 'Lưu nhóm', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: `Thêm mục vào ${title}`, exact: true }).waitFor();
    }
    async function item(group, label, type, fill) {
      await page.getByRole('button', { name: `Thêm mục vào ${group}`, exact: true }).click();
      const modal = page.getByRole('dialog');
      await modal.getByLabel('Tên hiển thị').fill(label);
      await modal.getByLabel(/^Loại/).selectOption(type);
      await fill(modal);
      await modal.getByRole('button', { name: 'Lưu mục', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: `Sửa ${label}`, exact: true }).waitFor();
    }
    await group('Laptop Theo Hãng', 10);
    await item('Laptop Theo Hãng', 'Acer', 'BRAND', m => m.getByLabel('Thương hiệu liên kết').selectOption(String(brands[0].id)));
    await item('Laptop Theo Hãng', 'ASUS', 'BRAND', m => m.getByLabel('Thương hiệu liên kết').selectOption(String(brands[1].id)));
    await group('Laptop Theo Khoảng Giá', 20);
    await item('Laptop Theo Khoảng Giá', 'Dưới 15 triệu', 'PRICE_FILTER', async m => { await m.getByLabel('Giá tối thiểu').fill('0'); await m.getByLabel('Giá tối đa').fill('15000000'); });
    await group('Laptop Theo Cấu Hình', 30);
    await item('Laptop Theo Cấu Hình', 'RAM 16GB', 'ATTRIBUTE_FILTER', async m => { await m.getByLabel(/^Thuộc tính/).selectOption('RAM'); await m.getByLabel('Giá trị thuộc tính').selectOption('16GB'); });
    await page.getByRole('group', { name: 'Thương hiệu nổi bật' }).getByLabel(brands[0].name, { exact: true }).check();
    await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi' }).waitFor();
    const artifacts = path.resolve(__dirname, '../../docs/mega-menu-screenshots');
    require('node:fs').mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'admin.png'), fullPage: true });
    const store = await context.newPage(); store.on('pageerror', e => errors.push(e.message)); store.setDefaultTimeout(15000);
    let menuRequests = 0; store.on('request', req => { if (new URL(req.url()).pathname === '/api/mega-menu') menuRequests++; });
    const openDesktop = async () => {
      await store.getByRole('button', { name: 'Danh mục', exact: true }).hover();
      await store.locator('#desktop-category-menu').getByRole('menuitem', { name: category.name, exact: true }).hover();
      const panel = store.getByLabel(`Mega Menu ${category.name}`, { exact: true });
      await panel.getByRole('heading', { name: 'Laptop Theo Hãng', exact: true }).waitFor();
      return panel;
    };
    await store.goto(base);
    let panel = await openDesktop();
    assert.equal(await panel.getByRole('heading').count(), 4);
    assert.equal(await panel.getByRole('link', { name: 'Acer', exact: true }).count(), 2);
    await store.screenshot({ path: path.join(artifacts, 'desktop.png') });
    await panel.getByRole('link', { name: 'Acer', exact: true }).first().hover();
    await store.waitForTimeout(220); assert.equal(await panel.isVisible(), true, 'Moving from category column to panel keeps menu open');
    for (let i = 0; i < 3; i++) await store.locator('#desktop-category-menu').getByRole('menuitem', { name: category.name, exact: true }).hover();
    assert.equal(menuRequests, 1, 'Hover uses one cached API request');
    await panel.getByRole('link', { name: 'Acer', exact: true }).first().click();
    await store.getByText(`${marker} Product 0`, { exact: true }).waitFor();
    assert.equal(await store.getByText(`${marker} Product 1`, { exact: true }).count(), 0);
    assert.equal(new URL(store.url()).searchParams.get('brand'), brands[0].slug);
    await store.goto(base); panel = await openDesktop(); await panel.getByRole('link', { name: 'Dưới 15 triệu', exact: true }).click();
    await store.getByText(`${marker} Product 0`, { exact: true }).waitFor(); assert.equal(await store.getByText(`${marker} Product 1`, { exact: true }).count(), 0);
    await store.goto(base); panel = await openDesktop(); await panel.getByRole('link', { name: 'RAM 16GB', exact: true }).click();
    await store.getByText(`${marker} Product 0`, { exact: true }).waitFor(); assert.equal(await store.getByText(`${marker} Product 1`, { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Ẩn nhóm Laptop Theo Hãng', exact: true }).click();
    await page.getByRole('button', { name: 'Hiện nhóm Laptop Theo Hãng', exact: true }).waitFor();
    await store.goto(base); await store.getByRole('button', { name: 'Danh mục', exact: true }).hover(); await store.locator('#desktop-category-menu').getByRole('menuitem', { name: category.name, exact: true }).hover();
    panel = store.getByLabel(`Mega Menu ${category.name}`, { exact: true }); await panel.getByRole('heading', { name: 'Laptop Theo Khoảng Giá', exact: true }).waitFor(); assert.equal(await panel.getByRole('heading', { name: 'Laptop Theo Hãng', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Hiện nhóm Laptop Theo Hãng', exact: true }).click(); await page.getByRole('button', { name: 'Ẩn nhóm Laptop Theo Hãng', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sửa nhóm Laptop Theo Khoảng Giá', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Thứ tự nhóm').fill('0'); await page.getByRole('dialog').getByLabel('Column span').fill('3');
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu nhóm', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await store.goto(base); panel = await openDesktop(); assert.equal(await panel.getByRole('heading').first().innerText(), 'Laptop Theo Khoảng Giá');
    for (const width of [1280, 1376, 1440]) {
      await store.setViewportSize({ width, height: 1000 }); panel = await openDesktop();
      const bounds = await store.locator('#desktop-category-menu').boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${width}px menu fits viewport`);
      const span = await panel.locator('[data-column-span="3"]').evaluate(el => getComputedStyle(el).gridColumnStart); assert.equal(span, 'span 3');
    }
    await store.keyboard.press('Escape');
    for (const width of [320, 390, 768, 820, 1024, 1032, 1180, 1279]) {
      await store.setViewportSize({ width, height: 844 });
      const trigger = store.locator('header button[aria-controls="mobile-category-drawer"]:visible').first();
      await trigger.waitFor();
      await store.waitForTimeout(100);
      await trigger.click();
      const drawer = store.getByRole('dialog', { name: 'Danh mục sản phẩm' });
      await drawer.getByRole('button', { name: category.name, exact: true }).click();
      await drawer.getByRole('button', { name: 'Laptop Theo Hãng', exact: true }).click();
      await drawer.getByRole('link', { name: 'ASUS', exact: true }).waitFor();
      if (width === 390) await store.screenshot({ path: path.join(artifacts, 'mobile.png') });
      assert.equal(await store.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px no horizontal overflow`);
      await drawer.getByRole('link', { name: 'ASUS', exact: true }).click();
      await store.getByText(`${marker} Product 1`, { exact: true }).waitFor(); assert.equal(await drawer.getAttribute('aria-hidden'), 'true');
      await store.goto(base);
    }
    assert.equal(await prisma.brand.count(), count, 'Admin menu never creates duplicate brands'); assert.deepEqual(errors, []);
    console.log('PASS real API browser: admin group/item CRUD, Acer/ASUS reuse, three filters, desktop hover/cache/order/span/visibility, featured brands, mobile/tablet drawer through 1279px and no overflow');
  } finally {
    if (browser) await browser.close();
    await prisma.product.deleteMany({ where: { id: { in: ids.products } } });
    await prisma.category.deleteMany({ where: { id: { in: ids.categories } } });
    await prisma.brand.deleteMany({ where: { id: { in: ids.brands } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } }); await prisma.$disconnect();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
