import '../config/env.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// A1: 10 CompatibilityRule rows
console.log('\n=== A1: CompatibilityRule (10 rows) ===');
const rules = await prisma.compatibilityRule.findMany({ take: 10, orderBy: { id: 'asc' } });
for (const r of rules) {
  console.log(JSON.stringify({
    id: r.id, name: r.name, ruleType: r.ruleType,
    groupAId: r.groupAId, attributeASlug: r.attributeASlug,
    groupBId: r.groupBId, attributeBSlug: r.attributeBSlug,
    isActive: r.isActive, config: r.config, errorMessage: r.errorMessage
  }));
}
if (rules.length === 0) console.log('(no rules found)');

// A2: ProductAttributeValue for one CPU, one mainboard, one case
console.log('\n=== A2: ProductAttributeValue for SEED-CPU-001, SEED-MB-001, SEED-CASE-001 ===');
const testSkus = ['SEED-CPU-001', 'SEED-MB-001', 'SEED-CASE-001'];
for (const sku of testSkus) {
  const p = await prisma.product.findUnique({
    where: { sku },
    include: { attributeValues: { include: { attribute: true, attributeValue: true } } },
  });
  if (!p) { console.log(`${sku}: NOT FOUND`); continue; }
  console.log(`\n${sku} (id=${p.id}):`);
  for (const pav of p.attributeValues) {
    console.log(`  slug=${pav.attribute?.slug} type=${pav.attribute?.type} attrValId=${pav.attributeValueId} valueText=${JSON.stringify(pav.valueText)} valueNumber=${pav.valueNumber}`);
  }
}

// A3: Product -> Category relationship
console.log('\n=== A3: Product-Category relation ===');
const sample = await prisma.product.findFirst({
  where: { sku: { startsWith: 'SEED-' } },
  select: { id: true, sku: true, categoryId: true, categoryRecord: { select: { id: true, name: true, slug: true } } },
});
console.log(JSON.stringify(sample, null, 2));
// Check if there's a join table
const fields = Object.keys(sample ?? {});
console.log('Fields available:', fields.join(', '));

await prisma.$disconnect();
