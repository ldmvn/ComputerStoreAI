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
  const errors = issues.filter(i => i.level === 'error').map(i => `[error:${i.code}] ${i.message.slice(0,80)}`);
  const warns  = issues.filter(i => i.level === 'warning').map(i => `[warn:${i.code}] ${i.message.slice(0,80)}`);
  const infos  = issues.filter(i => i.level === 'info').map(i => `[info] ${i.message.slice(0,60)}`);
  const miss   = d?.missing?.map(m => m.message.slice(0,60)) ?? [];
  const cart   = d?.canAddToCart;
  console.log(`\n[${label}] HTTP ${res.status}`);
  if (res.status >= 400) { console.log('  msg:', res.data?.message); return; }
  console.log(`  canAddToCart=${cart} errors=${errors.length} warns=${warns.length} infos=${infos.length} missing=${miss.length}`);
  for (const e of errors) console.log(' ', e);
  for (const w of warns) console.log(' ', w);
  for (const i of infos) console.log(' ', i);
  for (const m of miss) console.log('  [missing]', m);
}

async function id(sku) {
  const p = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
  if (!p) { console.log(`  SKU not found: ${sku}`); return null; }
  return p.id;
}

// Section D: sample valid config
const skus = ['SEED-CPU-004','SEED-MB-003','SEED-RAM-004','SEED-SSDM2-002','SEED-VGA-001','SEED-CASE-002','SEED-AIR-002','SEED-PSU-002'];
const ids = {};
for (const sku of skus) ids[sku] = await id(sku);
console.log('IDs:', ids);

const allFound = Object.values(ids).every(i => i !== null);
if (allFound) {
  const r = await post({ items: [
    { slot: 'cpu',        productId: ids['SEED-CPU-004'],    quantity: 1 },
    { slot: 'mainboard',  productId: ids['SEED-MB-003'],     quantity: 1 },
    { slot: 'ram',        productId: ids['SEED-RAM-004'],    quantity: 1 },
    { slot: 'ssd',        productId: ids['SEED-SSDM2-002'],  quantity: 1 },
    { slot: 'vga',        productId: ids['SEED-VGA-001'],    quantity: 1 },
    { slot: 'case',       productId: ids['SEED-CASE-002'],   quantity: 1 },
    { slot: 'cooler-air', productId: ids['SEED-AIR-002'],    quantity: 1 },
    { slot: 'psu',        productId: ids['SEED-PSU-002'],    quantity: 1 },
  ]});
  report('D: Full valid config', r);
} else {
  // Some SKUs missing - try with what we have
  console.log('Some SKUs missing, trying partial');
}

// Also confirm PSU_WATTAGE warning does NOT block canAddToCart
// Use a full config where everything is ok except PSU is undersized
const cpu001 = await id('SEED-CPU-001'); // 65W TDP
const vga006 = await id('SEED-VGA-006'); // 450W TDP
const psu001 = await id('SEED-PSU-001'); // 650W  (rec = (65+450+100)*1.2 = 738W)
const mb001  = await id('SEED-MB-001');
const ram001 = await id('SEED-RAM-001');
const case001 = await id('SEED-CASE-001');

if (cpu001 && vga006 && psu001 && mb001 && ram001 && case001) {
  const r = await post({ items: [
    { slot: 'cpu',       productId: cpu001,  quantity: 1 },
    { slot: 'mainboard', productId: mb001,   quantity: 1 },
    { slot: 'ram',       productId: ram001,  quantity: 1 },
    { slot: 'vga',       productId: vga006,  quantity: 1 },
    { slot: 'psu',       productId: psu001,  quantity: 1 },
    { slot: 'case',      productId: case001, quantity: 1 },
  ]});
  report('PSU warning only → canAddToCart=true (warning does not block)', r);
}

// 400: quantity > maxCount
const cpu1 = await id('SEED-CPU-001');
if (cpu1) {
  const r = await post({ items: [{ slot: 'cpu', productId: cpu1, quantity: 5 }] }); // cpu maxCount=1
  report('400 – quantity > maxCount', r);
}

await prisma.$disconnect();
