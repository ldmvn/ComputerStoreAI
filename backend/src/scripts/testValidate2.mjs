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
  const infos  = issues.filter(i => i.level === 'info').map(i => i.message.slice(0,60));
  const miss   = d?.missing?.map(m => m.message.slice(0,50)) ?? [];
  const cart   = d?.canAddToCart;
  console.log(`\n[${label}] HTTP ${res.status}`);
  if (res.status >= 400) { console.log('  msg:', res.data?.message); return; }
  console.log(`  canAddToCart=${cart} total=${d?.total}`);
  for (const e of errors) console.log(' ', e);
  for (const w of warns) console.log(' ', w);
  for (const i of infos) console.log('  [info]', i);
  for (const m of miss) console.log('  [missing]', m);
}

// Find mainboard with so-khe-m-2 = 1
const mbOneM2 = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-MB-' },
    attributeValues: { some: { attribute: { slug: 'so-khe-m-2' }, valueNumber: 1 } },
    isActive: true,
  },
  select: { id: true, sku: true },
});
console.log('MB with 1 M.2 slot:', mbOneM2?.sku);

// Find any SSD M.2
const ssdM2 = await prisma.product.findFirst({
  where: { categoryRecord: { slug: 'ssd-m2' }, isActive: true },
  select: { id: true, sku: true, stockQuantity: true },
});
console.log('SSD M.2:', ssdM2?.sku, 'stock:', ssdM2?.stockQuantity);

// Test: 3 SSD M.2 on 1-slot mainboard
if (mbOneM2 && ssdM2) {
  const r = await post({ items: [
    { slot: 'mainboard', productId: mbOneM2.id, quantity: 1 },
    { slot: 'ssd',       productId: ssdM2.id,   quantity: 3 },
  ]});
  report('3 SSD M.2 on 1-slot MB → M2_SLOTS error', r);
}

// Find PSU with low wattage
const allPsu = await prisma.product.findMany({
  where: { sku: { startsWith: 'SEED-PSU-' }, isActive: true },
  include: { attributeValues: { include: { attribute: true } } },
  select: { id: true, sku: true, stockQuantity: true, attributeValues: { include: { attribute: true } } },
});
console.log('\nPSUs:');
for (const p of allPsu) {
  const w = p.attributeValues.find(v => v.attribute?.slug === 'psu-wattage');
  console.log(' ', p.sku, 'wattage:', w?.valueNumber, 'stock:', p.stockQuantity);
}

// Find CPU with high TDP
const allCpu = await prisma.product.findMany({
  where: { sku: { startsWith: 'SEED-CPU-' }, isActive: true },
  include: { attributeValues: { include: { attribute: true } } },
  select: { id: true, sku: true, attributeValues: { include: { attribute: true } } },
});
console.log('\nCPUs TDP:');
for (const p of allCpu) {
  const t = p.attributeValues.find(v => v.attribute?.slug === 'tdp');
  console.log(' ', p.sku, 'tdp:', t?.valueNumber);
}

// Test PSU warning: find PSU + CPU where psu-wattage < (cpuTdp + 100) * 1.2
let cpuForPsu = null, psuForTest = null;
outer: for (const cpu of allCpu) {
  const cpuTdp = Number(cpu.attributeValues.find(v => v.attribute?.slug === 'tdp')?.valueNumber ?? 0);
  if (cpuTdp === 0) continue;
  for (const psu of allPsu) {
    const psuW = Number(psu.attributeValues.find(v => v.attribute?.slug === 'psu-wattage')?.valueNumber ?? 0);
    if (psuW === 0) continue;
    const recommended = Math.ceil((cpuTdp + 100) * 1.2);
    if (psuW < recommended) {
      cpuForPsu = cpu;
      psuForTest = psu;
      console.log(`\nFound PSU test: cpu=${cpu.sku} tdp=${cpuTdp} psu=${psu.sku} wattage=${psuW} recommended=${recommended}`);
      break outer;
    }
  }
}

if (cpuForPsu && psuForTest) {
  const r = await post({ items: [
    { slot: 'cpu', productId: cpuForPsu.id, quantity: 1 },
    { slot: 'psu', productId: psuForTest.id, quantity: 1 },
  ]});
  report('Low PSU → PSU_WATTAGE warning, canAddToCart still true', r);
}

// Test real product with missing data (RAM without ram-modules)
const ramNoModules = await prisma.product.findFirst({
  where: {
    categoryRecord: { slug: 'ram' },
    isActive: true,
    NOT: { attributeValues: { some: { attribute: { slug: 'ram-modules' } } } },
    sku: { not: { startsWith: 'SEED-' } },
  },
  select: { id: true, sku: true, name: true },
});
console.log('\nReal RAM without ram-modules:', ramNoModules?.sku, ramNoModules?.name?.slice(0,40));
if (ramNoModules && mbOneM2) {
  const r = await post({ items: [
    { slot: 'ram',       productId: ramNoModules.id, quantity: 1 },
    { slot: 'mainboard', productId: mbOneM2.id,      quantity: 1 },
  ]});
  report('Real RAM without ram-modules → MISSING_DATA info', r);
}

// Find mainboard with so-khe-ram = 2 and RAM with modules=2 to test RAM_SLOTS
const mbTwoSlots = await prisma.product.findFirst({
  where: {
    sku: { startsWith: 'SEED-MB-' }, isActive: true,
    attributeValues: { some: { attribute: { slug: 'so-khe-ram' }, valueNumber: 2 } },
  },
  select: { id: true, sku: true },
});
const ramTwoModules = await prisma.product.findFirst({
  where: {
    categoryRecord: { slug: 'ram' }, isActive: true,
    attributeValues: { some: { attribute: { slug: 'ram-modules' }, valueNumber: 2 } },
  },
  select: { id: true, sku: true },
});
console.log('\nMB 2-slot:', mbTwoSlots?.sku, 'RAM 2-module:', ramTwoModules?.sku);
if (mbTwoSlots && ramTwoModules) {
  // 2 kits of 2 modules = 4 modules total, but mainboard has only 2 slots
  const r = await post({ items: [
    { slot: 'mainboard', productId: mbTwoSlots.id,    quantity: 1 },
    { slot: 'ram',       productId: ramTwoModules.id, quantity: 2 },
  ]});
  report('2 kits × 2 modules = 4 modules on 2-slot MB → RAM_SLOTS error', r);
}

await prisma.$disconnect();
