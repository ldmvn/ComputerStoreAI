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
  const infos  = issues.filter(i => i.level === 'info').map(i => `[info:${i.code}] ${i.message.slice(0,60)}`);
  const miss   = d?.missing?.map(m => m.message.slice(0,60)) ?? [];
  const cart   = d?.canAddToCart;
  console.log(`\n[${label}] HTTP ${res.status}`);
  if (res.status >= 400) { console.log('  msg:', res.data?.message); return; }
  console.log(`  canAddToCart=${cart} total=${d?.total}`);
  for (const e of errors) console.log(' ', e);
  for (const w of warns) console.log(' ', w);
  for (const i of infos) console.log(' ', i);
  for (const m of miss) console.log('  [missing]', m);
}

// Get all MBs with so-khe-m-2
const mbs = await prisma.product.findMany({
  where: { sku: { startsWith: 'SEED-MB-' }, isActive: true },
  include: { attributeValues: { include: { attribute: true } } },
});
console.log('MB M.2 slots:');
const mbWithM2 = [];
for (const mb of mbs) {
  const m2 = mb.attributeValues.find(v => v.attribute?.slug === 'so-khe-m-2');
  if (m2) {
    console.log(`  ${mb.sku} so-khe-m-2=${Number(m2.valueNumber)}`);
    mbWithM2.push({ id: mb.id, sku: mb.sku, m2slots: Number(m2.valueNumber) });
  }
}

// Find MBs and CPUs for socket mismatch already confirmed
// Find a PSU with wattage and a CPU+VGA combo where total is high
const allPsuW = await prisma.productAttributeValue.findMany({
  where: { attribute: { slug: 'psu-wattage' }, product: { sku: { startsWith: 'SEED-PSU-' }, isActive: true } },
  include: { product: { select: { id: true, sku: true } } },
});
const allCpuTdp = await prisma.productAttributeValue.findMany({
  where: { attribute: { slug: 'tdp' }, product: { sku: { startsWith: 'SEED-CPU-' }, isActive: true } },
  include: { product: { select: { id: true, sku: true } } },
});
const allVgaTdp = await prisma.productAttributeValue.findMany({
  where: { attribute: { slug: 'tdp' }, product: { sku: { startsWith: 'SEED-VGA-' }, isActive: true } },
  include: { product: { select: { id: true, sku: true } } },
});

console.log('\nPSU wattages:', allPsuW.map(p => `${p.product.sku}=${Number(p.valueNumber)}W`).join(', '));
console.log('CPU TDP:', allCpuTdp.map(p => `${p.product.sku}=${Number(p.valueNumber)}W`).join(', '));
console.log('VGA TDP:', allVgaTdp.map(p => `${p.product.sku}=${Number(p.valueNumber)}W`).join(', '));

// Find a combo where cpu_tdp + vga_tdp + 100 * 1.2 > psu_wattage
const PSU_HEADROOM = 100, PSU_FACTOR = 1.2;
let psuWarnTest = null;
for (const psuRec of allPsuW) {
  const psuW = Number(psuRec.valueNumber);
  for (const cpuRec of allCpuTdp) {
    const cpuW = Number(cpuRec.valueNumber);
    for (const vgaRec of allVgaTdp) {
      const vgaW = Number(vgaRec.valueNumber);
      const rec = Math.ceil((cpuW + vgaW + PSU_HEADROOM) * PSU_FACTOR);
      if (psuW < rec) {
        psuWarnTest = { psu: psuRec, cpu: cpuRec, vga: vgaRec, rec };
        break;
      }
    }
    if (psuWarnTest) break;
  }
  if (psuWarnTest) break;
}

if (psuWarnTest) {
  console.log(`\nPSU warning combo: cpu=${psuWarnTest.cpu.product.sku} vga=${psuWarnTest.vga.product.sku} psu=${psuWarnTest.psu.product.sku} rec=${psuWarnTest.rec}W`);
  // Find VGA slot products
  const vgaSlotProds = await prisma.product.findMany({
    where: { categoryRecord: { slug: 'vga' }, isActive: true, id: psuWarnTest.vga.product.id },
    select: { id: true, sku: true },
  });
  if (vgaSlotProds.length > 0) {
    const r = await post({ items: [
      { slot: 'cpu', productId: psuWarnTest.cpu.product.id, quantity: 1 },
      { slot: 'vga', productId: vgaSlotProds[0].id,        quantity: 1 },
      { slot: 'psu', productId: psuWarnTest.psu.product.id, quantity: 1 },
    ]});
    report('PSU_WATTAGE warning (canAddToCart still true)', r);
  }
} else {
  console.log('\nNo PSU warning combo found in seed data — all PSUs are adequate for all CPUs+VGAs');
}

// Test M2_SLOTS: find a MB with fewer M2 slots than 3, use ssd qty=3
const mbSmallM2 = mbWithM2.find(m => m.m2slots < 3);
const ssdM2Prod = await prisma.product.findFirst({
  where: { categoryRecord: { slug: 'ssd-m2' }, isActive: true },
  select: { id: true, sku: true, stockQuantity: true },
});
console.log('\nMB small M2:', mbSmallM2?.sku, `(${mbSmallM2?.m2slots} slots)`, 'SSD M2:', ssdM2Prod?.sku, 'stock:', ssdM2Prod?.stockQuantity);
if (mbSmallM2 && ssdM2Prod && mbSmallM2.m2slots < ssdM2Prod.stockQuantity) {
  const qty = mbSmallM2.m2slots + 1;
  const r = await post({ items: [
    { slot: 'mainboard', productId: mbSmallM2.id,   quantity: 1 },
    { slot: 'ssd',       productId: ssdM2Prod.id,   quantity: qty },
  ]});
  report(`${qty} SSD M.2 on ${mbSmallM2.m2slots}-slot MB → M2_SLOTS error`, r);
}

// Test RAM_SLOTS
const mbRamSlots = await prisma.product.findMany({
  where: { sku: { startsWith: 'SEED-MB-' }, isActive: true },
  include: { attributeValues: { include: { attribute: true } } },
});
const ramModuleProds = await prisma.product.findMany({
  where: { categoryRecord: { slug: 'ram' }, isActive: true, sku: { startsWith: 'SEED-RAM-' } },
  include: { attributeValues: { include: { attribute: true } } },
});

console.log('\nRAM modules:');
for (const r of ramModuleProds) {
  const m = r.attributeValues.find(v => v.attribute?.slug === 'ram-modules');
  if (m) console.log(`  ${r.sku} ram-modules=${Number(m.valueNumber)}`);
}

// Find combo: ram.modules * qty > mb.so-khe-ram
let ramSlotsTest = null;
for (const mb of mbRamSlots) {
  const kheRam = mb.attributeValues.find(v => v.attribute?.slug === 'so-khe-ram');
  if (!kheRam) continue;
  const slots = Number(kheRam.valueNumber);
  for (const ram of ramModuleProds) {
    const modules = ram.attributeValues.find(v => v.attribute?.slug === 'ram-modules');
    if (!modules) continue;
    const modCount = Number(modules.valueNumber);
    // We need modCount * qty > slots; max qty = 4
    for (let qty = 2; qty <= 4; qty++) {
      if (modCount * qty > slots) {
        ramSlotsTest = { mb, ram, qty, slots, modules: modCount };
        break;
      }
    }
    if (ramSlotsTest) break;
  }
  if (ramSlotsTest) break;
}

if (ramSlotsTest) {
  const { mb, ram, qty, slots, modules } = ramSlotsTest;
  console.log(`\nRAM slots test: mb=${mb.sku} (${slots} slots) + ${qty}x ram=${ram.sku} (${modules} modules each) = ${modules*qty} total`);
  const r = await post({ items: [
    { slot: 'mainboard', productId: mb.id,  quantity: 1 },
    { slot: 'ram',       productId: ram.id, quantity: qty },
  ]});
  report(`RAM_SLOTS: ${modules*qty} modules > ${slots} slots → error`, r);
}

// Test: VGA out of stock (find an out-of-stock product)
const outOfStock = await prisma.product.findFirst({
  where: { categoryRecord: { slug: 'vga' }, stockQuantity: 0, isActive: true },
  select: { id: true, sku: true, stockQuantity: true },
});
const psuProd = await prisma.product.findFirst({
  where: { categoryRecord: { slug: 'nguon' }, isActive: true },
  select: { id: true, sku: true },
});
console.log('\nOut of stock VGA:', outOfStock?.sku);
if (outOfStock && psuProd) {
  const r = await post({ items: [
    { slot: 'vga', productId: outOfStock.id, quantity: 1 },
    { slot: 'psu', productId: psuProd.id,    quantity: 1 },
  ]});
  report('OUT_OF_STOCK VGA → error', r);
}

// Test: missing required slots detection
const cpuProd = await prisma.product.findFirst({
  where: { categoryRecord: { slug: 'cpu' }, isActive: true },
  select: { id: true, sku: true },
});
if (cpuProd) {
  const r = await post({ items: [{ slot: 'cpu', productId: cpuProd.id, quantity: 1 }] });
  report('Only CPU (missing mainboard,ram,psu,case) + missing storage', r);
}

await prisma.$disconnect();
