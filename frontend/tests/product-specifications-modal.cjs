const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.TEST_URL || 'http://localhost:3000';

const commonProduct = {
  id: 1, sku: 'SPEC-MODAL', category: 'Mainboard', categoryId: 1,
  categoryInfo: { id: 1, name: 'Mainboard', slug: 'mainboard' },
  brandId: null, brand: null, brandInfo: null, shortDescription: null, description: null,
  price: 1, originalPrice: null, stockQuantity: 1, lowStockThreshold: 5,
  isActive: true, isDeleted: false, stockStatus: 'IN_STOCK', primaryImage: null, images: [],
  highlightSpecs: [], ratingAverage: null, reviewCount: 0, commentCount: 0, viewCount: 0,
  createdAt: '2026-10-13T00:00:00.000Z', updatedAt: '2026-10-13T00:00:00.000Z',
};

const products = {
  'spec-modal-both': {
    ...commonProduct, id: 1, name: 'Kiểm thử thông số hai nhóm', slug: 'spec-modal-both',
    productAttributes: [
      { id: 2, name: 'Socket CPU', slug: 'socket-cpu', type: 'TEXT', unit: null, sortOrder: 20, valueIds: [], values: ['AM5'] },
      { id: 1, name: 'RAM tối đa', slug: 'ram-toi-da', type: 'NUMBER', unit: 'GB', sortOrder: 10, valueIds: [], values: ['64'] },
      { id: 3, name: 'Dòng trống', slug: 'dong-trong', type: 'TEXT', unit: null, sortOrder: 30, valueIds: [], values: ['   '] },
    ],
    customSpecifications: [
      { id: 1, name: 'BIOS', value: 'UEFI', sortOrder: 0 },
      { id: 2, name: 'LAN', value: '2.5 GbE', sortOrder: 1 },
      { id: 3, name: '  ram   TỐI ĐA ', value: 'Giá trị trùng không hiển thị', sortOrder: 2 },
      { id: 4, name: ' ', value: 'Tên trống không hiển thị', sortOrder: 3 },
      { id: 5, name: 'Giá trị trống', value: '   ', sortOrder: 4 },
      ...Array.from({ length: 18 }, (_, index) => ({ id: index + 6, name: `Cổng kết nối ${index + 1}`, value: `Cổng ${index + 1}`, sortOrder: index + 5 })),
    ],
  },
  'spec-modal-standard-only': {
    ...commonProduct, id: 2, name: 'Kiểm thử chỉ thuộc tính chuẩn', slug: 'spec-modal-standard-only',
    productAttributes: [{ id: 2, name: 'Socket CPU', slug: 'socket-cpu', type: 'TEXT', unit: null, sortOrder: 20, valueIds: [], values: ['AM5'] }],
    customSpecifications: [],
  },
  'spec-modal-custom-only': {
    ...commonProduct, id: 3, name: 'Kiểm thử chỉ thông số chung', slug: 'spec-modal-custom-only',
    productAttributes: [],
    customSpecifications: [{ id: 1, name: 'Công nghệ CPU', value: 'Kiểm thử', sortOrder: 10 }, { id: 2, name: 'BIOS', value: 'UEFI', sortOrder: 0 }],
  },
  'spec-modal-empty': {
    ...commonProduct, id: 4, name: 'Kiểm thử chưa có thông số', slug: 'spec-modal-empty',
    productAttributes: [], customSpecifications: [],
  },
};

(async () => {
  let browser;

  async function openSpecifications(page, product) {
    await page.goto(`${base}/products/${product.slug}`);
    await page.getByRole('heading', { name: product.name, exact: true }).waitFor();
    await page.getByRole('navigation', { name: 'Nội dung chi tiết sản phẩm', exact: true })
      .getByRole('link', { name: 'Thông số kỹ thuật', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Thông số kỹ thuật', exact: true });
    await dialog.waitFor();
    return dialog;
  }

  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
    await context.route('**/api/products/**', async route => {
      const parts = new URL(route.request().url()).pathname.split('/').filter(Boolean);
      if (parts.at(-1) === 'views') {
        await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { viewCount: 1 } });
        return;
      }
      if (parts.at(-1) === 'reviews') {
        await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 }, summary: { ratingAverage: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } } });
        return;
      }
      const product = products[decodeURIComponent(parts.at(-1))];
      await route.fulfill(product
        ? { headers: { 'access-control-allow-origin': '*' }, json: { product } }
        : { status: 404, headers: { 'access-control-allow-origin': '*' }, json: { message: 'Không tìm thấy sản phẩm.' } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(15000);

    let dialog = await openSpecifications(page, products['spec-modal-both']);
    assert.deepEqual(await dialog.getByRole('heading', { level: 3 }).allTextContents(), ['Thuộc tính chuẩn', 'Thông số chung']);
    assert.equal(await dialog.getByRole('table').count(), 2);
    const standardTable = dialog.getByRole('table').nth(0);
    const generalTable = dialog.getByRole('table').nth(1);
    assert.deepEqual(await standardTable.getByRole('rowheader').allTextContents(), ['RAM tối đa', 'Socket CPU'], 'Standard attributes follow Admin sort order and omit blank values');
    assert.deepEqual(await standardTable.locator('td').allTextContents(), ['64 GB', 'AM5'], 'NUMBER attributes include their configured unit');
    const generalNames = await generalTable.getByRole('rowheader').allTextContents();
    assert.deepEqual(generalNames.slice(0, 2), ['BIOS', 'LAN'], 'Free-form specifications retain their own sort order');
    assert.equal(generalNames.some(name => name.toLocaleLowerCase('vi').includes('ram')), false, 'A reliably matched duplicate is omitted from the general group');
    assert.equal(generalNames.some(name => !name.trim() || name === 'Giá trị trống'), false, 'Blank rows are omitted');
    const content = dialog.getByTestId('specifications-modal-content');
    assert.equal(await content.evaluate(element => getComputedStyle(element).overflowY), 'auto');
    assert.equal(await content.evaluate(element => element.scrollHeight > element.clientHeight), true, 'Long modal content scrolls internally');
    const desktopPanel = dialog.locator(':scope > div');
    const desktopBounds = await desktopPanel.boundingBox();
    assert.ok(desktopBounds.width <= 761 && desktopBounds.height <= 721, `Desktop modal respects configured width and viewport height (${desktopBounds.width}x${desktopBounds.height})`);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');

    dialog = await openSpecifications(page, products['spec-modal-standard-only']);
    assert.deepEqual(await dialog.getByRole('heading', { level: 3 }).allTextContents(), ['Thuộc tính chuẩn']);
    assert.equal(await dialog.getByText('Thông số chung', { exact: true }).count(), 0);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();

    dialog = await openSpecifications(page, products['spec-modal-custom-only']);
    assert.deepEqual(await dialog.getByRole('heading', { level: 3 }).allTextContents(), ['Thông số chung']);
    assert.equal(await dialog.getByText('Thuộc tính chuẩn', { exact: true }).count(), 0);
    assert.deepEqual(await dialog.getByRole('rowheader').allTextContents(), ['BIOS', 'Công nghệ CPU']);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();

    dialog = await openSpecifications(page, products['spec-modal-empty']);
    await dialog.getByText('Thông số kỹ thuật đang được cập nhật.', { exact: true }).waitFor();
    assert.equal(await dialog.getByRole('heading', { level: 3 }).count(), 0);
    assert.equal(await dialog.getByRole('table').count(), 0);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();

    await page.setViewportSize({ width: 390, height: 700 });
    dialog = await openSpecifications(page, products['spec-modal-both']);
    const mobilePanel = dialog.locator(':scope > div');
    const mobileBounds = await mobilePanel.boundingBox();
    assert.ok(mobileBounds.width <= 390 && mobileBounds.height <= 631, `Mobile modal stays within the viewport (${mobileBounds.width}x${mobileBounds.height})`);
    assert.equal(await mobilePanel.evaluate(element => element.scrollWidth > element.clientWidth), false, 'Mobile modal has no horizontal overflow');
    const closeButton = dialog.getByRole('button', { name: 'Đóng', exact: true });
    const closeY = (await closeButton.boundingBox()).y;
    await dialog.getByTestId('specifications-modal-content').evaluate(element => { element.scrollTop = element.scrollHeight; });
    assert.equal((await closeButton.boundingBox()).y, closeY, 'Header and close button remain fixed while modal content scrolls');

    assert.deepEqual(errors, []);
    console.log('PASS specifications modal: separated sources, conditional groups, units, dedupe, order, internal scrolling and responsive bounds');
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
