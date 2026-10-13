import '../config/env.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. All CompatibilityRules
const rules = await prisma.compatibilityRule.findMany({ orderBy: { id: 'asc' } });
const groups = await prisma.buildPcGroup.findMany({ select: { id: true, slug: true } });
const gMap = Object.fromEntries(groups.map(g => [g.id, g.slug]));
console.log('=== CompatibilityRules ===');
for (const r of rules) {
  console.log(`[${r.id}] ${r.name} | ${r.ruleType} | A:${gMap[r.groupAId]??r.groupAId}.${r.attributeASlug} B:${gMap[r.groupBId]??r.groupBId}.${r.attributeBSlug} | config:${JSON.stringify(r.config)} | err:${r.errorMessage?.slice(0,60)}`);
}

// 2. Decode socket-cpu attributeValue IDs (69,70,71,72)
const avs = await prisma.attributeValue.findMany({
  where: { id: { in: [69, 70, 71, 72, 110, 111, 112, 113, 114, 48] } },
  select: { id: true, value: true, attribute: { select: { slug: true } } }
});
console.log('\n=== AttributeValues ===');
for (const av of avs) console.log(`  id=${av.id} slug=${av.attribute?.slug} value="${av.value}"`);

// 3. BuildPcGroup slugs
const groups2 = await prisma.buildPcGroup.findMany({ select: { id: true, slug: true, isRequired: true } });
console.log('\n=== BuildPcGroups ===');
for (const g of groups2) console.log(`  [${g.id}] ${g.slug} required:${g.isRequired}`);

await prisma.$disconnect();
