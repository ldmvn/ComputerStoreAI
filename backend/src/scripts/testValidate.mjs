// Test script for POST /api/v1/build-pc/validate
// Run: node src/scripts/testValidate.mjs

const BASE = 'http://localhost:5000';

async function post(body) {
  const res = await fetch(`${BASE}/api/v1/build-pc/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ── Get product IDs by SKU ────────────────────────────────────────────────
import '../config/env.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function id(sku) {
  const p = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
  if (!p) throw new Error(`SKU not found: ${sku}`);
  return p.id;
}

const ids = {};
const skuList = [
  'SEED-CPU-004', 'SEED-CPU-001',           // AM5 vs AM4
  'SEED-MB-001', 'SEED-MB-003',             // LGA1700, X670E
  'SEED-RAM-001', 'SEED-RAM-004',           // DDR4 RAM, DDR5 RAM
  'SEED-SSDM2-002', 'SEED-VGA-001',
  'SEED-CASE-002', 'SEED-AIR-002', 'SEED-PSU-002', 'SEED-PSU-001',
];
for (const sku of skuList) {
  try { ids[sku] = await id(sku); } catch { ids[sku] = null; }
}

// Fallback for missing SKUs
const allSkus = await prisma.product.findMany({
  where: { sku: { startsWith: 'SEED-' }, isActive: true },
  select: { id: true, sku: true, categoryRecord: { select: { slug: true } } },
});
for (const p of allSkus) ids[p.sku] = p.id;

function I(sku) {
  if (!ids[sku]) throw new Error(`No ID for ${sku}`);
  return ids[sku];
}

function report(label, res) {
  const d = res.data?.data;
  const issues = d?.issues ?? [];
  const errors = issues.filter(i => i.level === 'error').map(i => `[error:${i.code}] ${i.message.slice(0,60)}`);
  const warns  = issues.filter(i => i.level === 'warning').map(i => `[warn:${i.code}] ${i.message.slice(0,60)}`);
  const infos  = issues.filter(i => i.level === 'info').length;
  const miss   = d?.missing?.length ?? 0;
  const cart   = d?.canAddToCart;
  console.log(`\n[${label}] HTTP ${res.status}`);
  if (res.status >= 400) { console.log('  msg:', res.data?.message); return; }
  console.log(`  errors:${errors.length} warns:${warns.length} info:${infos} missing:${miss} canAddToCart:${cart}`);
  for (const e of errors) console.log(' ', e);
  for (const w of warns)  console.log(' ', w);
}

// ── Test cases ────────────────────────────────────────────────────────────

// 1. Valid config (AM5 CPU + X670E MB + DDR5 RAM + SSD M.2 + VGA + Case + Cooler air + PSU)
// Find correct products
const cpuAm5 = allSkus.find(p => p.sku.startsWith('SEED-CPU-') && p.categoryRecord?.slug === 'cpu')?.sku;
const mbAm5 = 'SEED-MB-005';  // X670E AM5
const ramDdr5 = allSkus.find(p => p.sku.startsWith('SEED-RAM-') && p.categoryRecord?.slug === 'ram')?.sku;
const ssdM2 = allSkus.find(p => p.categoryRecord?.slug === 'ssd-m2')?.sku;
const vga = allSkus.find(p => p.categoryRecord?.slug === 'vga')?.sku;
const caseItem = allSkus.find(p => p.categoryRecord?.slug === 'vo-case')?.sku;
const coolerAir = allSkus.find(p => p.categoryRecord?.slug === 'tan-nhiet-cpu-air')?.sku;
const psu = allSkus.find(p => p.categoryRecord?.slug === 'nguon')?.sku;
const hdd = allSkus.find(p => p.categoryRecord?.slug === 'hdd')?.sku;

console.log('Product SKUs found:', { cpuAm5, mbAm5, ramDdr5, ssdM2, vga, caseItem, coolerAir, psu });

// Test 1: Try a known valid set
if (cpuAm5 && mbAm5 && ramDdr5 && ssdM2 && vga && caseItem && coolerAir && psu) {
  const r1 = await post({ items: [
    { slot: 'cpu',       productId: I(cpuAm5),   quantity: 1 },
    { slot: 'mainboard', productId: I(mbAm5),    quantity: 1 },
    { slot: 'ram',       productId: I(ramDdr5),  quantity: 1 },
    { slot: 'ssd',       productId: I(ssdM2),    quantity: 1 },
    { slot: 'vga',       productId: I(vga),      quantity: 1 },
    { slot: 'case',      productId: I(caseItem), quantity: 1 },
    { slot: 'cooler-air',productId: I(coolerAir),quantity: 1 },
    { slot: 'psu',       productId: I(psu),      quantity: 1 },
  ]});
  report('Valid config (AM5+DDR5)', r1);
}

// Find AM5 CPU and Intel MB (LGA1700)
const cpuAm5Prod = await prisma.product.findFirst({
  where: { sku: { startsWith: 'SEED-CPU-' } },
  include: { attributeValues: { include: { attribute: true, attributeValue: true } } },
});
const mbIntel = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-MB-' },
    attributeValues: { some: { attributeValue: { value: { contains: 'LGA' } } } },
  },
  select: { id: true, sku: true },
});
const cpuAm5Prod2 = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-CPU-' },
    attributeValues: { some: { attributeValue: { value: { contains: 'AM5' } } } },
  },
  select: { id: true, sku: true },
});

// Test 2: AM5 CPU + Intel LGA1700 MB → socket mismatch
if (cpuAm5Prod2 && mbIntel && psu && caseItem) {
  const r2 = await post({ items: [
    { slot: 'cpu',       productId: cpuAm5Prod2.id, quantity: 1 },
    { slot: 'mainboard', productId: mbIntel.id,      quantity: 1 },
    { slot: 'psu',       productId: I(psu),          quantity: 1 },
    { slot: 'case',      productId: I(caseItem),     quantity: 1 },
  ]});
  report('AM5 CPU + Intel MB → socket error', r2);
}

// Test 3: DDR4 RAM + DDR5 MB
const ramDdr4Prod = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-RAM-' },
    attributeValues: { some: { attributeValue: { value: { contains: 'DDR4' } } } },
  },
  select: { id: true, sku: true },
});
const mbDdr5 = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-MB-' },
    attributeValues: { some: { attributeValue: { value: { contains: 'DDR5' } } } },
  },
  select: { id: true, sku: true },
});
if (ramDdr4Prod && mbDdr5) {
  const r3 = await post({ items: [
    { slot: 'ram',       productId: ramDdr4Prod.id, quantity: 1 },
    { slot: 'mainboard', productId: mbDdr5.id,      quantity: 1 },
  ]});
  report('DDR4 RAM + DDR5 MB → RAM type error', r3);
}

// Test 4: 3 SSD M.2 on a 1-slot mainboard (find MB with so-khe-m-2=1)
const mbOneM2 = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-MB-' },
    attributeValues: { some: { attribute: { slug: 'so-khe-m-2' }, valueNumber: 1 } },
  },
  select: { id: true, sku: true },
});
if (mbOneM2 && ssdM2) {
  const r4 = await post({ items: [
    { slot: 'mainboard', productId: mbOneM2.id,   quantity: 1 },
    { slot: 'ssd',       productId: I(ssdM2),     quantity: 3 },
  ]});
  report('3 SSD M.2 in 1-slot MB → M2_SLOTS error', r4);
}

// Test 5: Low PSU → warning
const lowPsu = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-PSU-' },
    attributeValues: { some: { attribute: { slug: 'psu-wattage' }, valueNumber: { lt: 500 } } },
  },
  select: { id: true, sku: true },
});
const highTdpCpu = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-CPU-' },
    attributeValues: { some: { attribute: { slug: 'tdp' }, valueNumber: { gte: 100 } } },
  },
  select: { id: true, sku: true },
});
if (lowPsu && highTdpCpu) {
  const r5 = await post({ items: [
    { slot: 'cpu', productId: highTdpCpu.id, quantity: 1 },
    { slot: 'psu', productId: lowPsu.id,     quantity: 1 },
  ]});
  report('Low PSU + high TDP CPU → warning', r5);
}

// Test 6: Config without HDD/SSD → missing storage
if (cpuAm5Prod2 && psu) {
  const r6 = await post({ items: [
    { slot: 'cpu', productId: cpuAm5Prod2.id, quantity: 1 },
    { slot: 'psu', productId: I(psu),         quantity: 1 },
  ]});
  report('No HDD/SSD → missing storage', r6);
}

// Test 7: 400 – slot doesn't exist
const r7 = await post({ items: [{ slot: 'invalid-slot', productId: 1, quantity: 1 }] });
report('400 – invalid slot', r7);

// Test 8: 400 – product in wrong slot
if (cpuAm5Prod2 && psu) {
  const r8 = await post({ items: [{ slot: 'psu', productId: cpuAm5Prod2.id, quantity: 1 }] });
  report('400 – CPU in PSU slot', r8);
}

// Test 9: 400 – duplicate slot
if (cpuAm5Prod2) {
  const r9 = await post({ items: [
    { slot: 'cpu', productId: cpuAm5Prod2.id, quantity: 1 },
    { slot: 'cpu', productId: cpuAm5Prod2.id, quantity: 1 },
  ]});
  report('400 – duplicate slot', r9);
}

// Test 10: 400 – VGA + VGA Like New together
if (vga) {
  const vgaLN = allSkus.find(p => p.categoryRecord?.slug === 'vga-like-new')?.sku;
  if (vgaLN) {
    const r10 = await post({ items: [
      { slot: 'vga',          productId: I(vga),   quantity: 1 },
      { slot: 'vga-like-new', productId: I(vgaLN), quantity: 1 },
    ]});
    report('400 – VGA + VGA Like New (exclusive group)', r10);
  }
}

// Test 11: Empty items
const r11 = await post({ items: [] });
report('400 – empty items', r11);

await prisma.$disconnect();
