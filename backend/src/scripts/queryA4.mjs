import '../config/env.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const skus = [
  'SEED-VGALN-001','SEED-VGALN-002','SEED-VGALN-003',
  'SEED-AIR-001','SEED-AIR-002','SEED-AIR-003','SEED-AIR-004','SEED-AIR-005',
  'SEED-AIO-001','SEED-AIO-002','SEED-AIO-003','SEED-AIO-004',
  'SEED-CASE-001','SEED-CASE-002','SEED-CASE-003','SEED-CASE-004','SEED-CASE-005','SEED-CASE-006',
  'SEED-MB-006','SEED-CPU-004',
];

const prods = await prisma.product.findMany({
  where: { sku: { in: skus } },
  select: {
    id: true, sku: true, stockQuantity: true,
    categoryRecord: { select: { slug: true } },
    attributeValues: {
      include: { attribute: { select: { slug: true } } }
    }
  }
});

for (const p of prods) {
  const attrs = p.attributeValues
    .map(v => `${v.attribute?.slug}=${v.valueNumber !== null ? Number(v.valueNumber) : v.attributeValueId}`)
    .join(' | ');
  console.log(`${p.sku} [${p.categoryRecord?.slug}] stock:${p.stockQuantity} | ${attrs.slice(0, 300)}`);
}

// Also find a product with stockQuantity = 0 or low stock
const outOfStock = await prisma.product.findMany({
  where: { stockQuantity: { lte: 2 }, isActive: true },
  select: { id: true, sku: true, stockQuantity: true, categoryRecord: { select: { slug: true } } },
  take: 10,
});
console.log('\nLow/out-of-stock products:');
for (const p of outOfStock) {
  console.log(`  ${p.sku} [${p.categoryRecord?.slug}] stock:${p.stockQuantity}`);
}

// MEM0001 check
const mem1 = await prisma.product.findFirst({
  where: { sku: 'MEM0001' },
  select: { id: true, sku: true, stockQuantity: true, categoryRecord: { select: { slug: true } } }
});
console.log('\nMEM0001:', mem1);

await prisma.$disconnect();
