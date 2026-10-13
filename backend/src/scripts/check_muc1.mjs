import '../config/env.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ===== MUC 1: verify 7 SKUs =====
const skus = ['SEED-CPU-006','SEED-MB-003','SEED-MB-004','SEED-MB-005','SEED-MB-009','SEED-MB-010','SEED-MB-012'];

const expected = {
  'SEED-CPU-006': { name: 'CPU AMD Ryzen 7 7800X3D (4.2GHz Up to 5.0GHz, 104MB Cache, 8 Cores, 16 Threads, Socket AM5)' },
  'SEED-MB-003':  { 'so-khe-m-2': 3, 'ram-toi-da': 256, 'pcie-cho-vga': '4.0' },
  'SEED-MB-004':  { 'ram-toi-da': 256 },
  'SEED-MB-005':  { chipset: 'X670E' },
  'SEED-MB-009':  { 'so-khe-m-2': 4 },
  'SEED-MB-010':  { 'so-khe-ram': 2, 'so-khe-m-2': 6, 'ram-toi-da': 96 },
  'SEED-MB-012':  { chipset: 'B860', brand: 'gigabyte' },
};

// MB-012 name check separately (Vietnamese chars may encode differently)
const MB012_NAME_SUBSTR = 'B860M AORUS ELITE';
const CPU006_NAME_SUBSTR = '4.2GHz';

const rows = [];

for (const sku of skus) {
  const p = await prisma.product.findUnique({
    where: { sku },
    include: {
      attributeValues: { include: { attribute: true, attributeValue: true } },
      brandRecord: { select: { slug: true } },
    },
  });
  if (!p) { rows.push({ sku, field: '(product)', expected: '?', actual: 'NOT FOUND', ok: false }); continue; }

  const exp = expected[sku] || {};

  // Special name checks
  if (sku === 'SEED-CPU-006') {
    const ok = p.name.includes(CPU006_NAME_SUBSTR);
    rows.push({ sku, field: 'name', expected: '...4.2GHz...', actual: p.name.slice(0,70), ok });
  }
  if (sku === 'SEED-MB-012') {
    const ok = p.name.includes(MB012_NAME_SUBSTR);
    rows.push({ sku, field: 'name', expected: '...B860M AORUS ELITE...', actual: p.name.slice(0,70), ok });
  }

  if (exp.brand !== undefined)
    rows.push({ sku, field: 'brand', expected: exp.brand, actual: p.brandRecord?.slug ?? '?', ok: p.brandRecord?.slug === exp.brand });

  for (const [slug, expVal] of Object.entries(exp)) {
    if (slug === 'name' || slug === 'brand') continue;
    const pav = p.attributeValues.find(v => v.attribute?.slug === slug);
    const attrType = pav?.attribute?.type;
    let actual;
    if (!pav) actual = '(none)';
    else if (attrType === 'NUMBER') actual = Number(pav.valueNumber);
    else if (attrType === 'SELECT') actual = pav.attributeValue?.value ?? '(none)';
    else actual = pav.valueText;
    rows.push({ sku, field: slug, expected: String(expVal), actual: String(actual), ok: String(actual) === String(expVal) });
  }
}

const skuW  = Math.max(14, ...rows.map(r => r.sku.length));
const fW    = Math.max(12, ...rows.map(r => r.field.length));
const expW  = Math.max(22, ...rows.map(r => r.expected.length));
const actW  = Math.max(10, ...rows.map(r => r.actual.length));
console.log('\n=== MUC 1: Kiem tra 7 SKU ===');
console.log(`${'SKU'.padEnd(skuW)}  ${'Truong'.padEnd(fW)}  ${'Trong JSON'.padEnd(expW)}  ${'Trong DB'.padEnd(actW)}  Khop?`);
console.log('-'.repeat(skuW + fW + expW + actW + 18));
for (const r of rows) {
  console.log(`${r.sku.padEnd(skuW)}  ${r.field.padEnd(fW)}  ${r.expected.padEnd(expW)}  ${r.actual.padEnd(actW)}  ${r.ok ? 'v' : 'MISMATCH'}`);
}
const mismatches = rows.filter(r => !r.ok);
if (mismatches.length === 0) {
  console.log('\nTat ca khop.');
} else {
  console.log(`\n${mismatches.length} dong KHONG KHOP - DUNG.`);
  process.exit(1);
}

// ===== MUC 2: non-SEED- products updated in last 3 hours =====
console.log('\n=== MUC 2: San pham khong phai SEED- co updatedAt trong 3h gan nhat ===');
const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
const recent = await prisma.product.findMany({
  where: { NOT: { sku: { startsWith: 'SEED-' } }, updatedAt: { gte: since } },
  select: { sku: true, name: true, updatedAt: true },
  orderBy: { updatedAt: 'desc' },
});
console.log(`Ket qua: ${recent.length} san pham (ky vong 0)`);
for (const p of recent) console.log(` ${p.sku}  ${p.name.slice(0,50)}  ${p.updatedAt.toISOString()}`);

await prisma.$disconnect();
