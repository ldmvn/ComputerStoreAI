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
  const miss   = d?.missing?.map(m => m.message.slice(0,60)) ?? [];
  const cart   = d?.canAddToCart;
  console.log(`\n[${label}] HTTP ${res.status}`);
  if (res.status >= 400) { console.log('  msg:', res.data?.message); return; }
  console.log(`  canAddToCart=${cart} errors=${errors.length} warns=${warns.length} missing=${miss.length}`);
  for (const e of errors) console.log(' ', e);
  for (const w of warns) console.log(' ', w);
  for (const m of miss) console.log('  [missing]', m);
}

async function id(sku) {
  const p = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
  return p?.id ?? null;
}

// PSU warning + HDD = canAddToCart=true
const cpu001  = await id('SEED-CPU-001');
const vga006  = await id('SEED-VGA-006');  // 450W TDP
const psu001  = await id('SEED-PSU-001');  // 650W
const mb001   = await id('SEED-MB-001');
const ram001  = await id('SEED-RAM-001');
const case001 = await id('SEED-CASE-001');
const hdd = await prisma.product.findFirst({ where: { categoryRecord: { slug: 'hdd' }, isActive: true }, select: { id: true, sku: true } });

console.log('HDD:', hdd?.sku, 'id:', hdd?.id);
if (cpu001 && vga006 && psu001 && mb001 && ram001 && case001 && hdd) {
  const r = await post({ items: [
    { slot: 'cpu',       productId: cpu001,  quantity: 1 },
    { slot: 'mainboard', productId: mb001,   quantity: 1 },
    { slot: 'ram',       productId: ram001,  quantity: 1 },
    { slot: 'hdd',       productId: hdd.id,  quantity: 1 },
    { slot: 'vga',       productId: vga006,  quantity: 1 },
    { slot: 'psu',       productId: psu001,  quantity: 1 },
    { slot: 'case',      productId: case001, quantity: 1 },
  ]});
  report('PSU_WATTAGE warning, canAddToCart=true (warning does NOT block)', r);
}

// Confirm VGA too long for case (Rule 4: vga-length > case-max-vga-length)
// Find a VGA + Case combo where vga-length > case-max-vga-length
const vgaLengths = await prisma.productAttributeValue.findMany({
  where: { attribute: { slug: 'vga-length' }, product: { categoryRecord: { slug: 'vga' }, isActive: true } },
  include: { product: { select: { id: true, sku: true } } },
});
const caseMaxVga = await prisma.productAttributeValue.findMany({
  where: { attribute: { slug: 'case-max-vga-length' }, product: { categoryRecord: { slug: 'vo-case' }, isActive: true } },
  include: { product: { select: { id: true, sku: true } } },
});
console.log('\nVGA lengths:', vgaLengths.map(v => `${v.product.sku}=${Number(v.valueNumber)}mm`).join(', '));
console.log('Case max VGA:', caseMaxVga.map(v => `${v.product.sku}=${Number(v.valueNumber)}mm`).join(', '));

// Find combo vga-length > case-max-vga-length
let vgaTooLong = null;
for (const vga of vgaLengths) {
  const vLen = Number(vga.valueNumber);
  for (const cs of caseMaxVga) {
    if (vLen > Number(cs.valueNumber)) {
      vgaTooLong = { vga, cs };
      break;
    }
  }
  if (vgaTooLong) break;
}
if (vgaTooLong) {
  const { vga, cs } = vgaTooLong;
  console.log(`VGA too long: ${vga.product.sku}=${Number(vga.valueNumber)}mm > ${cs.product.sku} max=${Number(cs.valueNumber)}mm`);
  const r = await post({ items: [
    { slot: 'vga',  productId: vga.product.id, quantity: 1 },
    { slot: 'case', productId: cs.product.id,  quantity: 1 },
  ]});
  report('VGA too long for case → error', r);
} else {
  console.log('No VGA-too-long combo in seed data');
}

// Real non-SEED RAM missing ram-modules attribute → MISSING_DATA info
const realRamNoMod = await prisma.product.findFirst({
  where: {
    categoryRecord: { slug: 'ram' }, isActive: true,
    NOT: {
      sku: { startsWith: 'SEED-' },
      attributeValues: { some: { attribute: { slug: 'ram-modules' } } }
    },
  },
  select: { id: true, sku: true, name: true },
});
console.log('\nReal RAM without ram-modules:', realRamNoMod ? `${realRamNoMod.sku}: ${realRamNoMod.name?.slice(0,40)}` : 'none found');

await prisma.$disconnect();
