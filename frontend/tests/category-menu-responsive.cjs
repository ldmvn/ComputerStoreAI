const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.TEST_URL || 'http://127.0.0.1:3000';
const mobileWidths = [390, 768, 820, 1024, 1032, 1180, 1279];
const desktopWidths = [1280, 1376, 1440];

const category = {
  id: 1,
  name: 'Laptop',
  slug: 'laptop',
  icon: 'Laptop',
  children: [{ id: 2, name: 'Laptop gaming', slug: 'laptop-gaming', icon: 'Laptop' }],
};

const menu = {
  category: { ...category, href: '/customer/products?category=laptop' },
  groups: [{
    id: 10,
    title: 'Theo nhu cầu',
    columnSpan: 1,
    items: [{ id: 100, label: 'Laptop văn phòng', type: 'CUSTOM_URL', href: '/customer/products?category=laptop&section=office' }],
  }],
  brands: [],
};

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    await context.route('**/api/categories/menu', route => route.fulfill({ json: { categories: [category] } }));
    await context.route('**/api/mega-menu', route => route.fulfill({ json: { menus: [menu] } }));
    await context.route('**/api/banners/home', route => route.fulfill({ json: { mainHero: [], bottomLeft: null, bottomRight: null, sideLeft: null, sideRightTop: null, sideRightMiddle: null, sideRightBottom: null, sideSlides: {} } }));
    await context.route('**/api/product-sections/home', route => route.fulfill({ json: { sections: [] } }));

    const page = await context.newPage();
    const runtimeErrors = [];
    const isChunkError = message => /Cannot find module|ChunkLoadError|missing required error components/i.test(message);
    page.on('pageerror', error => { if (isChunkError(error.message)) runtimeErrors.push(error.message); });
    page.on('console', message => { if (message.type() === 'error' && isChunkError(message.text())) runtimeErrors.push(message.text()); });
    await page.goto(base, { waitUntil: 'domcontentloaded' });

    const drawer = page.locator('#mobile-category-drawer');
    const desktopMenu = page.locator('#desktop-category-menu');
    const drawerIsOpen = () => drawer.getAttribute('aria-hidden').then(value => value === 'false');
    const waitForDrawer = async open => {
      await page.waitForFunction(expected => (
        document.querySelector('#mobile-category-drawer')?.getAttribute('aria-hidden') === String(!expected)
      ), open);
      if (open) await page.waitForTimeout(250);
    };

    for (const width of mobileWidths) {
      await page.setViewportSize({ width, height: width === 1032 ? 1376 : 900 });
      await page.waitForTimeout(100);
      const trigger = page.locator('header button[aria-controls="mobile-category-drawer"]:visible').first();
      await trigger.waitFor();
      await trigger.click();
      await waitForDrawer(true);

      assert.equal(await drawerIsOpen(), true, `${width}px: mobile drawer opens`);
      assert.equal(await desktopMenu.isVisible(), false, `${width}px: desktop menu stays hidden`);
      const bounds = await drawer.boundingBox();
      assert.ok(bounds && Math.abs(bounds.x) < 1, `${width}px: drawer starts at left edge`);
      assert.ok(bounds.width < width && bounds.height <= (width === 1032 ? 1376 : 900), `${width}px: drawer fits viewport`);
      if (width < 768) assert.ok(bounds.width <= 340, `${width}px: mobile width is preserved`);
      else assert.ok(bounds.width <= 420, `${width}px: tablet drawer stays partial-width`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px: no horizontal overflow`);

      await drawer.getByRole('button', { name: category.name, exact: true }).click();
      await drawer.getByRole('button', { name: 'Quay lại danh sách danh mục', exact: true }).waitFor();
      await drawer.getByRole('button', { name: 'Theo nhu cầu', exact: true }).click();
      await drawer.getByRole('link', { name: 'Laptop văn phòng', exact: true }).waitFor();
      await drawer.getByRole('button', { name: 'Quay lại nhóm danh mục', exact: true }).click();
      await drawer.getByRole('button', { name: 'Quay lại danh sách danh mục', exact: true }).click();

      if (width === 768) {
        await page.keyboard.press('Escape');
      } else if (width === 1032) {
        await page.getByRole('button', { name: 'Đóng menu danh mục', exact: true }).first().click();
      } else {
        await drawer.getByRole('button', { name: 'Đóng menu danh mục', exact: true }).click();
      }
      await waitForDrawer(false);
      assert.equal(await drawerIsOpen(), false, `${width}px: drawer closes`);
    }

    for (const width of desktopWidths) {
      await page.setViewportSize({ width, height: 1000 });
      const trigger = page.locator('header button[aria-controls="desktop-category-menu"]:visible').first();
      await trigger.waitFor();
      await page.mouse.move(width - 2, 900);
      await trigger.hover();
      await desktopMenu.getByRole('menu', { name: 'Danh mục sản phẩm' }).waitFor();
      assert.equal(await drawerIsOpen(), false, `${width}px: drawer stays closed`);
      await desktopMenu.getByRole('menuitem', { name: category.name, exact: true }).hover();
      await page.getByLabel(`Mega Menu ${category.name}`, { exact: true }).waitFor();
      await page.mouse.move(width - 2, 900);
      await page.waitForTimeout(400);
      assert.equal(await desktopMenu.isVisible(), false, `${width}px: leaving desktop menu closes it`);
    }

    await page.setViewportSize({ width: 1279, height: 900 });
    await page.locator('header button[aria-controls="mobile-category-drawer"]:visible').first().click();
    await waitForDrawer(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await waitForDrawer(false);
    await page.mouse.move(1278, 850);
    await page.locator('header button[aria-controls="desktop-category-menu"]:visible').first().hover();
    await desktopMenu.getByRole('menu', { name: 'Danh mục sản phẩm' }).waitFor();
    await page.setViewportSize({ width: 1032, height: 1376 });
    await page.waitForFunction(() => {
      const drawer = document.querySelector('#mobile-category-drawer');
      const desktop = document.querySelector('#desktop-category-menu');
      return drawer?.getAttribute('aria-hidden') === 'true' && desktop && getComputedStyle(desktop).visibility === 'hidden';
    });
    await page.locator('header button[aria-controls="mobile-category-drawer"]:visible').first().click();
    await waitForDrawer(true);
    assert.equal(await desktopMenu.isVisible(), false, 'Resize never leaves drawer and Mega Menu open together');
    assert.deepEqual(runtimeErrors, [], 'No missing-module or chunk-loading runtime errors');

    console.log(`PASS category menu: Drawer at ${mobileWidths.join('/')}px; desktop Mega Menu at ${desktopWidths.join('/')}px; back/close/backdrop/Escape/resize and overflow verified`);
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
