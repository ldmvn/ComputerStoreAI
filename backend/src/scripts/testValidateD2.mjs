import '../config/env.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BASE = 'http://localhost:5000';
async function post(body) {
  const res = await fetch(`${BASE}/api/v1/build-pc/validate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

function report(label, res) {
  const d = res.data?.data;
  const issues = d?.issues ?? [];
  console.log(`\n[${label}] HTTP ${res.status}`);
  if (res.status >= 400) { console.log('  400:', res.data?.message); return; }
  const cart = d?.canAddToCart;
  const miss  = d?.missing?.length ?? 0;
  console.log(`  canAddToCart=${cart} errors=${issues.filter(i=>i.level==='error').length} warns=${issues.filter(i=>i.level==='warning').length} missing=${miss}`);
  for (const i of issues) {
    const skus = i.slots?.join('+') ?? '';
    console.log(`  ${skus} | ${i.level} | ${i.code} | ${i.message}`);
  }
  for (const m of (d?.missing??[])) console.log(`  [missing] ${m.message}`);
}

async function id(sku) {
  const p = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
  if (!p) throw new Error(`SKU not found: ${sku}`);
  return p.id;
}

// Fetch all needed IDs upfront
const IDS = {};
const skuList = [
  'SEED-CPU-004', 'SEED-MB-003', 'SEED-MB-006',
  'SEED-RAM-004', 'SEED-SSDM2-002', 'SEED-VGA-001',
  'SEED-CASE-002', 'SEED-CASE-004', 'SEED-CASE-005',
  'SEED-AIR-002', 'SEED-AIR-005',
  'SEED-AIO-001',
  'SEED-VGALN-001', 'SEED-VGALN-002',
  'SEED-PSU-002',
];
for (const sku of skuList) {
  try { IDS[sku] = await id(sku); }
  catch { console.log(`  MISSING: ${sku}`); }
}
// Find out-of-stock products
const outOfStock0 = await prisma.product.findFirst({
  where: { stockQuantity: 0, isActive: true, categoryRecord: { slug: { in: ['hdd','ssd-m2','ssd-25'] } } },
  select: { id: true, sku: true, stockQuantity: true, categoryRecord: { select: { slug: true } } },
});
console.log('Out-of-stock prod:', outOfStock0?.sku, 'cat:', outOfStock0?.categoryRecord?.slug, 'stock:', outOfStock0?.stockQuantity);

// MEM0001
const mem1id = await prisma.product.findUnique({ where: { sku: 'MEM0001' }, select: { id: true } });
IDS['MEM0001'] = mem1id?.id;

console.log('IDs loaded:', Object.entries(IDS).map(([k,v]) => `${k}=${v}`).join(', '));

// ── 4a. SEED-CPU-004 (AM5) + SEED-MB-006 (Intel LGA1700) → socket error ─────
const r4a = await post({ items: [
  { slot: 'cpu',       productId: IDS['SEED-CPU-004'], quantity: 1 },
  { slot: 'mainboard', productId: IDS['SEED-MB-006'],  quantity: 1 },
  { slot: 'ram',       productId: IDS['SEED-RAM-004'], quantity: 1 },
  { slot: 'psu',       productId: IDS['SEED-PSU-002'], quantity: 1 },
  { slot: 'case',      productId: IDS['SEED-CASE-002'],quantity: 1 },
  { slot: 'ssd',       productId: IDS['SEED-SSDM2-002'],quantity: 1 },
]});
report('4a: CPU-004 AM5 + MB-006 LGA1700 → socket error', r4a);

// ── 4b. SEED-CPU-004 (AM5) + SEED-AIR-005 (AM4/LGA1700 only) → cooler socket error ─
const r4b = await post({ items: [
  { slot: 'cpu',        productId: IDS['SEED-CPU-004'],  quantity: 1 },
  { slot: 'cooler-air', productId: IDS['SEED-AIR-005'],  quantity: 1 },
  { slot: 'mainboard',  productId: IDS['SEED-MB-003'],   quantity: 1 },
  { slot: 'ram',        productId: IDS['SEED-RAM-004'],  quantity: 1 },
  { slot: 'psu',        productId: IDS['SEED-PSU-002'],  quantity: 1 },
  { slot: 'case',       productId: IDS['SEED-CASE-002'], quantity: 1 },
  { slot: 'ssd',        productId: IDS['SEED-SSDM2-002'],quantity: 1 },
]});
report('4b: CPU-004 AM5 + AIR-005 (AM4/LGA1700) → cooler socket error', r4b);

// ── 4c. SEED-AIR-002 (160mm) + SEED-CASE-006 (max 140mm) → height error ─────
const r4c = await post({ items: [
  { slot: 'cooler-air', productId: IDS['SEED-AIR-002'],  quantity: 1 },
  { slot: 'case',       productId: IDS['SEED-CASE-005'], quantity: 1 }, // max 155mm
]});
report('4c-try1: AIR-002 160mm + CASE-005 (max 155mm) → height error', r4c);

// Get CASE-006 id
let case006id;
try { case006id = await id('SEED-CASE-006'); } catch { case006id = null; }
if (case006id) {
  const r4c2 = await post({ items: [
    { slot: 'cooler-air', productId: IDS['SEED-AIR-002'], quantity: 1 },
    { slot: 'case',       productId: case006id,           quantity: 1 },
  ]});
  report('4c: AIR-002 (160mm) + CASE-006 (max 140mm) → height error', r4c2);
}

// ── 4d. SEED-AIO-001 (360mm) + SEED-CASE-004 (120/240 only) → radiator error ─
const r4d = await post({ items: [
  { slot: 'cooler-aio', productId: IDS['SEED-AIO-001'],  quantity: 1 },
  { slot: 'case',       productId: IDS['SEED-CASE-004'], quantity: 1 },
]});
report('4d: AIO-001 (360mm) + CASE-004 (120/240 only) → radiator error', r4d);

// ── 4e. SEED-VGALN-001 (313mm) + SEED-CASE-005 (max 270mm) → error; + valid case ─
const r4e1 = await post({ items: [
  { slot: 'vga-like-new', productId: IDS['SEED-VGALN-001'], quantity: 1 },
  { slot: 'case',         productId: IDS['SEED-CASE-005'],  quantity: 1 },
]});
report('4e-err: VGALN-001 313mm + CASE-005 max 270mm → error', r4e1);

const r4e2 = await post({ items: [
  { slot: 'vga-like-new', productId: IDS['SEED-VGALN-001'], quantity: 1 },
  { slot: 'case',         productId: IDS['SEED-CASE-002'],  quantity: 1 }, // max 365mm > 313mm
]});
report('4e-ok: VGALN-001 313mm + CASE-002 max 365mm → no VGA error', r4e2);

// ── 4f. OUT_OF_STOCK ──────────────────────────────────────────────────────────
if (outOfStock0) {
  // Determine which slot this product belongs to
  const catToSlot = { 'hdd': 'hdd', 'ssd-m2': 'ssd', 'ssd-25': 'ssd' };
  const slot = catToSlot[outOfStock0.categoryRecord?.slug] ?? 'ssd';
  const r4f = await post({ items: [
    { slot, productId: outOfStock0.id, quantity: 1 },
  ]});
  report(`4f: OUT_OF_STOCK ${outOfStock0.sku} (stock=${outOfStock0.stockQuantity}) slot=${slot}`, r4f);
} else {
  console.log('\n[4f: OUT_OF_STOCK] No product with stock=0 found in hdd/ssd categories');
}

// ── 4g. MISSING_DATA: MEM0001 (real RAM, no ram-modules) + SEED-MB-003 ────────
if (IDS['MEM0001'] && IDS['SEED-MB-003']) {
  const r4g = await post({ items: [
    { slot: 'ram',       productId: IDS['MEM0001'],     quantity: 1 },
    { slot: 'mainboard', productId: IDS['SEED-MB-003'], quantity: 1 },
    { slot: 'cpu',       productId: IDS['SEED-CPU-004'],quantity: 1 },
    { slot: 'psu',       productId: IDS['SEED-PSU-002'],quantity: 1 },
    { slot: 'case',      productId: IDS['SEED-CASE-002'],quantity: 1 },
    { slot: 'ssd',       productId: IDS['SEED-SSDM2-002'],quantity: 1 },
  ]});
  report('4g: MEM0001 (no ram-modules) + MB-003 → MISSING_DATA info only', r4g);
}

// ── 4h. Full valid config ──────────────────────────────────────────────────────
// CPU-004 AM5 + MB-003 (AM5) + RAM-004 (DDR5) + SSDM2-002 + VGA-001 + CASE-002 (max 165mm) + AIR-002 (160mm) + PSU-002
const r4h = await post({ items: [
  { slot: 'cpu',        productId: IDS['SEED-CPU-004'],   quantity: 1 },
  { slot: 'mainboard',  productId: IDS['SEED-MB-003'],    quantity: 1 },
  { slot: 'ram',        productId: IDS['SEED-RAM-004'],   quantity: 1 },
  { slot: 'ssd',        productId: IDS['SEED-SSDM2-002'], quantity: 1 },
  { slot: 'vga',        productId: IDS['SEED-VGA-001'],   quantity: 1 },
  { slot: 'case',       productId: IDS['SEED-CASE-002'],  quantity: 1 },
  { slot: 'cooler-air', productId: IDS['SEED-AIR-002'],   quantity: 1 },
  { slot: 'psu',        productId: IDS['SEED-PSU-002'],   quantity: 1 },
]});
report('4h: Full valid config (CPU-004+MB-003+RAM-004+SSDM2+VGA+CASE-002+AIR-002+PSU-002)', r4h);

await prisma.$disconnect();
