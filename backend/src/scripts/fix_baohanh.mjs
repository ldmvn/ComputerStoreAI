import '../config/env.js';
import { PrismaClient } from '@prisma/client';

const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

// Find SEED- products missing "Bao hanh" spec
const missing = await prisma.product.findMany({
  where: {
    sku: { startsWith: 'SEED-' },
    NOT: { specifications: { some: { name: 'Bảo hành' } } },
  },
  select: { id: true, sku: true, specifications: { select: { sortOrder: true }, orderBy: { sortOrder: 'asc' } } },
  orderBy: { sku: 'asc' },
});

const total = await prisma.product.count({ where: { sku: { startsWith: 'SEED-' } } });
const withBH = await prisma.product.count({
  where: { sku: { startsWith: 'SEED-' }, specifications: { some: { name: 'Bảo hành' } } },
});
console.log(`SEED- total: ${total}`);
console.log(`Co "Bao hanh": ${withBH}`);
console.log(`Thieu "Bao hanh": ${missing.length}`);

if (missing.length === 0) {
  console.log('Khong co SKU nao can them.');
  await prisma.$disconnect();
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\n[DRY RUN] Se them "Bao hanh" = "12 thang" cho:');
  for (const p of missing) console.log(` ${p.sku}`);
  await prisma.$disconnect();
  process.exit(0);
}

// Add "Bao hanh" at end (sortOrder = max+1 or 9999 if no specs)
let added = 0;
for (const p of missing) {
  const maxSort = p.specifications.length > 0
    ? Math.max(...p.specifications.map(s => s.sortOrder))
    : 9998;
  const sortOrder = Math.max(maxSort + 1, 9999);
  await prisma.productSpecification.create({
    data: { productId: p.id, name: 'Bảo hành', value: '12 tháng', sortOrder },
  });
  console.log(`Them "Bao hanh" cho ${p.sku} (sortOrder=${sortOrder})`);
  added++;
}
console.log(`\nDa them: ${added} dong "Bao hanh".`);

await prisma.$disconnect();
