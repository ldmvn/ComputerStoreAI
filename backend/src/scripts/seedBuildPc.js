// Seed script: Build PC — categories, attributes, groups, compatibility rules.
// Safe to run multiple times (idempotent, additive only).
// Run: node src/scripts/seedBuildPc.js [--dry-run] [--cleanup] [--force]
//
// Compatibility rules handled by application code (NOT seeded):
//   11. sum(quantity × ram-modules per slot) ≤ so-khe-ram (mainboard)
//   12. count(SSD M.2 slots chosen) ≤ so-khe-m-2 (mainboard)
//   13. psu-wattage >= (tdp CPU + tdp VGA + 100) × 1.2
//   14. phải có ít nhất một HDD hoặc SSD

import '../config/env.js';
import { PrismaClient } from '@prisma/client';

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CLEANUP  = args.includes('--cleanup');
const FORCE    = args.includes('--force');

if (process.env.NODE_ENV === 'production' && !FORCE) {
  console.error('ERROR: Từ chối chạy trong môi trường production. Thêm --force nếu thực sự cần.');
  process.exit(1);
}

const prisma = new PrismaClient();
const stats  = { created: 0, skipped: 0, updated: 0, deleted: 0 };
let   fakeId = -1; // counter for virtual IDs in dry-run simulation

function nextFakeId() { return fakeId--; }

function logOp(action, type, identifier, extra = '') {
  const tag = `[${action}]`.padEnd(10);
  const t   = type.padEnd(26);
  console.log(`${tag} ${t} ${identifier}${extra ? '  ' + extra : ''}`);
  if      (action === 'CREATE') stats.created++;
  else if (action === 'SKIP')   stats.skipped++;
  else if (action === 'UPDATE') stats.updated++;
  else if (action === 'DELETE') stats.deleted++;
}

// ── Data definitions ──────────────────────────────────────────────────────────

// 15 new leaf categories
// ban-phim-chuot: root-level (parentId=null) — purposely NOT a child of ban-phim (id=22)
// so that the keyboard slot (→ban-phim) does not inherit it via subcategory search.
const NEW_CATEGORIES = [
  // parent=17 (Main, CPU, VGA)
  { name: 'Card màn hình',          slug: 'vga',                   parentId: 17,   sortOrder: 10 },
  { name: 'Card màn hình Like New', slug: 'vga-like-new',          parentId: 17,   sortOrder: 11 },
  // parent=18 (Case, Nguồn, Tản)
  { name: 'Nguồn máy tính',         slug: 'nguon',                 parentId: 18,   sortOrder: 10 },
  { name: 'Vỏ case máy tính',       slug: 'vo-case',               parentId: 18,   sortOrder: 11 },
  { name: 'Tản nhiệt CPU (Air)',     slug: 'tan-nhiet-cpu-air',     parentId: 18,   sortOrder: 12 },
  { name: 'Tản nhiệt CPU (AIO)',     slug: 'tan-nhiet-cpu-aio',     parentId: 18,   sortOrder: 13 },
  { name: 'Tản nhiệt nước Custom',   slug: 'tan-nhiet-cpu-custom',  parentId: 18,   sortOrder: 14 },
  { name: 'Quạt case',              slug: 'quat-case',             parentId: 18,   sortOrder: 15 },
  // parent=19 (Ổ cứng, Ram, Thẻ nhớ)
  { name: 'Ổ cứng SSD M.2',         slug: 'ssd-m2',                parentId: 19,   sortOrder: 10 },
  { name: 'Ổ cứng SSD 2.5"',        slug: 'ssd-25',                parentId: 19,   sortOrder: 11 },
  { name: 'Ổ cứng HDD',             slug: 'hdd',                   parentId: 19,   sortOrder: 12 },
  // parent=20 (Loa, Mirco, Webcam)
  { name: 'Loa máy tính',           slug: 'loa',                   parentId: 20,   sortOrder: 10 },
  // root (no parent) — sibling of ban-phim, NOT child
  { name: 'Bộ bàn phím + chuột',   slug: 'ban-phim-chuot',        parentId: null, sortOrder: 30 },
  // parent=23 (Chuột, Lót Chuột)
  { name: 'Chuột máy tính',         slug: 'chuot',                 parentId: 23,   sortOrder: 10 },
  // parent=25 (Ghế, Bàn)
  { name: 'Ghế Gaming',             slug: 'ghe-gaming',            parentId: 25,   sortOrder: 10 },
];

// 8 new attributes to create
// Reused (NOT re-created): loai-ram(29), socket-cpu(32), kich-thuoc-mainboard(34),
//                           so-khe-ram(35), so-khe-m-2(38) — all already usedInBuildPC=true
const NEW_ATTRIBUTES = [
  { name: 'Chiều dài VGA',               slug: 'vga-length',            type: 'NUMBER', unit: 'mm',  usedInBuildPC: false, sortOrder: 90 },
  { name: 'Chiều dài VGA tối đa (Case)', slug: 'case-max-vga-length',   type: 'NUMBER', unit: 'mm',  usedInBuildPC: false, sortOrder: 91 },
  { name: 'TDP',                          slug: 'tdp',                   type: 'NUMBER', unit: 'W',   usedInBuildPC: false, sortOrder: 92 },
  { name: 'Công suất nguồn',             slug: 'psu-wattage',           type: 'NUMBER', unit: 'W',   usedInBuildPC: false, sortOrder: 93 },
  { name: 'Chiều cao tản nhiệt',         slug: 'cooler-height',         type: 'NUMBER', unit: 'mm',  usedInBuildPC: false, sortOrder: 94 },
  { name: 'Chiều cao tản nhiệt tối đa',  slug: 'case-max-cooler-height',type: 'NUMBER', unit: 'mm',  usedInBuildPC: false, sortOrder: 95 },
  { name: 'Số module RAM (mỗi thanh)',   slug: 'ram-modules',           type: 'NUMBER', unit: null,  usedInBuildPC: false, sortOrder: 96 },
  { name: 'Kích thước két nước AIO',    slug: 'radiator-size',         type: 'SELECT', unit: 'mm',  usedInBuildPC: true,  sortOrder: 97 },
];

// AttributeValues only for new SELECT attributes
const ATTR_VALUES = {
  'radiator-size': ['120', '240', '280', '360', '420'],
};

// 20 BuildPcGroups (sortOrder 1–20)
// [name, slug, categorySlugs[], isRequired, minCount, maxCount, badgeText, exclusiveGroup, sortOrder]
const GROUPS = [
  ['Bộ vi xử lý',                     'cpu',                 ['cpu'],                      true,  1, 1, null,           null,          1],
  ['Bo mạch chủ',                     'mainboard',           ['main'],                     true,  1, 1, null,           null,          2],
  ['RAM',                             'ram',                 ['ram'],                      true,  1, 4, null,           null,          3],
  ['Ổ cứng HDD',                      'hdd',                 ['hdd'],                      false, 0, 4, null,           null,          4],
  ['Ổ cứng SSD',                      'ssd',                 ['ssd-m2', 'ssd-25'],         false, 0, 4, 'GIÁ CỰC SỐC', null,          5],
  ['Card màn hình',                   'vga',                 ['vga'],                      false, 0, 1, 'GIÁ CỰC SỐC', 'vga-slot',    6],
  ['Card màn hình Like New',          'vga-like-new',        ['vga-like-new'],             false, 0, 1, null,           'vga-slot',    7],
  ['Nguồn',                           'psu',                 ['nguon'],                    true,  1, 1, null,           null,          8],
  ['Vỏ Case',                         'case',                ['vo-case'],                  true,  1, 1, null,           null,          9],
  ['Màn hình',                        'monitor',             ['man-hinh'],                 false, 0, 3, null,           null,         10],
  ['Bộ bàn phím, chuột',              'keyboard-mouse-combo',['ban-phim-chuot'],           false, 0, 1, null,           null,         11],
  ['Bàn phím',                        'keyboard',            ['ban-phim'],                 false, 0, 1, null,           null,         12],
  ['Chuột',                           'mouse',               ['chuot'],                    false, 0, 1, null,           null,         13],
  ['Tai nghe',                        'headphone',           ['tai-nghe'],                 false, 0, 1, null,           null,         14],
  ['Loa',                             'speaker',             ['loa'],                      false, 0, 1, null,           null,         15],
  ['Ghế Gaming',                      'chair',               ['ghe-gaming'],               false, 0, 1, null,           null,         16],
  ['Quạt làm mát',                    'case-fan',            ['quat-case'],                false, 0, 6, null,           null,         17],
  ['Tản nhiệt khí',                   'cooler-air',          ['tan-nhiet-cpu-air'],        false, 0, 1, null,           'cooler-slot', 18],
  ['Tản nhiệt nước All in One',       'cooler-aio',          ['tan-nhiet-cpu-aio'],        false, 0, 1, null,           'cooler-slot', 19],
  ['Tản nhiệt nước Custom',           'cooler-custom',       ['tan-nhiet-cpu-custom'],     false, 0, 1, null,           'cooler-slot', 20],
];

// Rule type constants
const RT = { MATCH: 'ATTR_MATCH', SUBSET: 'ATTR_SUBSET', LTE: 'ATTR_LTE' };

// 10 seeded compatibility rules — use REAL attribute slugs from DB
// [name, ruleType, groupASlug, attrASlug, groupBSlug, attrBSlug, errorMessage, sortOrder]
const RULES = [
  ['CPU phải tương thích socket với Bo mạch chủ',
    RT.MATCH,  'cpu',         'socket-cpu',           'mainboard',     'socket-cpu',
    'Socket CPU không tương thích với Bo mạch chủ',            1],
  ['RAM phải đúng loại với Bo mạch chủ',
    RT.MATCH,  'ram',         'loai-ram',             'mainboard',     'loai-ram',
    'Loại RAM không tương thích với Bo mạch chủ',              2],
  ['Bo mạch chủ phải vừa Vỏ Case (form factor)',
    RT.SUBSET, 'mainboard',   'kich-thuoc-mainboard', 'case',          'kich-thuoc-mainboard',
    'Bo mạch chủ không vừa Vỏ Case',                          3],
  ['VGA phải vừa Vỏ Case (chiều dài)',
    RT.LTE,    'vga',         'vga-length',           'case',          'case-max-vga-length',
    'VGA quá dài so với Vỏ Case',                             4],
  ['VGA Like New phải vừa Vỏ Case (chiều dài)',
    RT.LTE,    'vga-like-new','vga-length',           'case',          'case-max-vga-length',
    'VGA Like New quá dài so với Vỏ Case',                    5],
  ['Tản nhiệt khí phải vừa Vỏ Case (chiều cao)',
    RT.LTE,    'cooler-air',  'cooler-height',        'case',          'case-max-cooler-height',
    'Tản nhiệt khí quá cao so với Vỏ Case',                   6],
  ['Tản nhiệt khí phải hỗ trợ socket CPU',
    RT.SUBSET, 'cpu',         'socket-cpu',           'cooler-air',    'socket-cpu',
    'Tản nhiệt khí không hỗ trợ socket của CPU',              7],
  ['Tản nhiệt nước AIO phải hỗ trợ socket CPU',
    RT.SUBSET, 'cpu',         'socket-cpu',           'cooler-aio',    'socket-cpu',
    'Tản nhiệt AIO không hỗ trợ socket của CPU',              8],
  ['Tản nhiệt nước Custom phải hỗ trợ socket CPU',
    RT.SUBSET, 'cpu',         'socket-cpu',           'cooler-custom', 'socket-cpu',
    'Tản nhiệt nước Custom không hỗ trợ socket của CPU',      9],
  ['Tản nhiệt nước AIO phải vừa Vỏ Case (kích thước két nước)',
    RT.SUBSET, 'cooler-aio',  'radiator-size',        'case',          'radiator-size',
    'Vỏ Case không hỗ trợ kích thước két nước AIO',          10],
];

// ── Validation ────────────────────────────────────────────────────────────────

async function validateRefs(existingCatMap, existingAttrMap) {
  const errors = [];
  const newCatSlugs  = new Set(NEW_CATEGORIES.map(c => c.slug));
  const newAttrSlugs = new Set(NEW_ATTRIBUTES.map(a => a.slug));
  const groupSlugs   = new Set(GROUPS.map(g => g[1]));

  // Every category slug referenced by a group must exist or be in NEW_CATEGORIES
  for (const [, slug, catSlugs] of GROUPS) {
    for (const cs of catSlugs) {
      if (!existingCatMap[cs] && !newCatSlugs.has(cs)) {
        errors.push(`MISSING: Category "${cs}" (used by group "${slug}")`);
      }
    }
  }

  // Every attribute slug used in a rule must exist or be in NEW_ATTRIBUTES
  for (const [name, , groupASlug, attrASlug, groupBSlug, attrBSlug] of RULES) {
    if (!existingAttrMap[attrASlug] && !newAttrSlugs.has(attrASlug))
      errors.push(`MISSING: Attribute "${attrASlug}" (rule "${name}" attrA)`);
    if (!existingAttrMap[attrBSlug] && !newAttrSlugs.has(attrBSlug))
      errors.push(`MISSING: Attribute "${attrBSlug}" (rule "${name}" attrB)`);
  }

  // Every group slug used in a rule must be in GROUPS
  for (const [name, , groupASlug, , groupBSlug] of RULES) {
    if (!groupSlugs.has(groupASlug))
      errors.push(`MISSING: Group "${groupASlug}" (rule "${name}" groupA)`);
    if (!groupSlugs.has(groupBSlug))
      errors.push(`MISSING: Group "${groupBSlug}" (rule "${name}" groupB)`);
  }

  return errors;
}

// ── Seed phases ───────────────────────────────────────────────────────────────

async function seedCategories(existingCatMap) {
  console.log('\n─── Categories (15 mới) ────────────────────────────────────────');
  for (const def of NEW_CATEGORIES) {
    if (existingCatMap[def.slug]) {
      logOp('SKIP', 'Category', def.slug, `id=${existingCatMap[def.slug].id}`);
    } else {
      logOp('CREATE', 'Category', def.slug,
        `"${def.name}"  parent=${def.parentId ?? 'root'}`);
      if (!DRY_RUN) {
        const c = await prisma.category.create({
          data: { name: def.name, slug: def.slug, parentId: def.parentId, sortOrder: def.sortOrder, isActive: true },
        });
        existingCatMap[def.slug] = c;
      } else {
        existingCatMap[def.slug] = { id: nextFakeId(), slug: def.slug, _virtual: true };
      }
    }
  }
}

async function seedAttributes(existingAttrMap) {
  console.log('\n─── Attributes (8 mới; 5 tái dùng, không thay đổi) ─────────────');
  const REUSED = [
    { slug: 'loai-ram',             id: 29,  note: 'SELECT, usedInBuildPC already true' },
    { slug: 'socket-cpu',           id: 32,  note: 'SELECT, usedInBuildPC=true' },
    { slug: 'kich-thuoc-mainboard', id: 34,  note: 'SELECT, usedInBuildPC=true' },
    { slug: 'so-khe-ram',           id: 35,  note: 'NUMBER, usedInBuildPC=true (luật code 11)' },
    { slug: 'so-khe-m-2',           id: 38,  note: 'NUMBER, usedInBuildPC=true (luật code 12)' },
  ];
  for (const r of REUSED) {
    logOp('SKIP', 'Attribute (reused)', r.slug, `id=${r.id}  ${r.note}`);
  }

  for (const def of NEW_ATTRIBUTES) {
    if (existingAttrMap[def.slug]) {
      logOp('SKIP', 'Attribute', def.slug, `id=${existingAttrMap[def.slug].id}`);
    } else {
      logOp('CREATE', 'Attribute', def.slug,
        `type=${def.type}${def.unit ? ' unit=' + def.unit : ''}  buildPC=${def.usedInBuildPC}`);
      if (!DRY_RUN) {
        const a = await prisma.attribute.create({
          data: { name: def.name, slug: def.slug, type: def.type, unit: def.unit, usedInBuildPC: def.usedInBuildPC, sortOrder: def.sortOrder, isActive: true },
        });
        existingAttrMap[def.slug] = a;
      } else {
        existingAttrMap[def.slug] = { id: nextFakeId(), slug: def.slug, _virtual: true };
      }
    }
  }
}

async function seedAttributeValues(existingAttrMap) {
  console.log('\n─── AttributeValues (radiator-size: 5 values) ───────────────────');
  for (const [attrSlug, values] of Object.entries(ATTR_VALUES)) {
    const attr = existingAttrMap[attrSlug];
    if (!attr) {
      console.warn(`  WARN: attribute "${attrSlug}" not in map — skipping values`);
      continue;
    }

    for (const [i, val] of values.entries()) {
      if (attr._virtual) {
        // New attribute created this dry-run — simulate
        logOp('CREATE', 'AttributeValue', `${attrSlug}: ${val}`,
          `sortOrder=${i}  (virtual attrId=${attr.id})`);
        continue;
      }
      const existing = await prisma.attributeValue.findUnique({
        where: { attributeId_value: { attributeId: attr.id, value: val } },
      });
      if (existing) {
        logOp('SKIP', 'AttributeValue', `${attrSlug}: ${val}`, `id=${existing.id}`);
      } else {
        logOp('CREATE', 'AttributeValue', `${attrSlug}: ${val}`, `sortOrder=${i}`);
        if (!DRY_RUN) {
          await prisma.attributeValue.create({
            data: { attributeId: attr.id, value: val, sortOrder: i, isActive: true },
          });
        }
      }
    }
  }
}

async function seedGroups(existingCatMap) {
  console.log('\n─── BuildPcGroups (20) ──────────────────────────────────────────');
  const groupMap = {};

  for (const [name, slug, catSlugs, isRequired, minCount, maxCount, badgeText, exclusiveGroup, sortOrder] of GROUPS) {
    const existing = await prisma.buildPcGroup.findUnique({ where: { slug } });
    if (existing) {
      logOp('SKIP', 'BuildPcGroup', slug, `id=${existing.id}`);
      groupMap[slug] = existing;
    } else {
      const flags = [
        isRequired ? 'required' : 'optional',
        `max=${maxCount}`,
        badgeText      ? `badge="${badgeText}"` : '',
        exclusiveGroup ? `excl=${exclusiveGroup}` : '',
      ].filter(Boolean).join(' ');
      logOp('CREATE', 'BuildPcGroup', slug, `"${name}"  ${flags}`);
      if (!DRY_RUN) {
        const g = await prisma.buildPcGroup.create({
          data: { name, slug, isRequired, minCount, maxCount, badgeText, exclusiveGroup, sortOrder, isActive: true },
        });
        groupMap[slug] = g;
      } else {
        groupMap[slug] = { id: nextFakeId(), slug, _virtual: true };
      }
    }

    // BuildPcGroupCategory links
    const group = groupMap[slug];
    for (const catSlug of catSlugs) {
      const cat   = existingCatMap[catSlug];
      const catId = cat?.id;
      const grpId = group?.id;

      if (!catId || !grpId || cat?._virtual || group?._virtual) {
        logOp('CREATE', 'GroupCategory', `${slug} → ${catSlug}`,
          `groupId=${grpId ?? '?'}  catId=${catId ?? '?'}  (simulated)`);
        continue;
      }

      const link = await prisma.buildPcGroupCategory.findUnique({
        where: { groupId_categoryId: { groupId: grpId, categoryId: catId } },
      });
      if (link) {
        logOp('SKIP', 'GroupCategory', `${slug} → ${catSlug}`);
      } else {
        logOp('CREATE', 'GroupCategory', `${slug} → ${catSlug}`);
        if (!DRY_RUN) {
          await prisma.buildPcGroupCategory.create({ data: { groupId: grpId, categoryId: catId } });
        }
      }
    }
  }
  return groupMap;
}

async function seedCompatibilityRules(groupMap) {
  console.log('\n─── CompatibilityRules (10; luật 11-14 xử lý bằng code) ─────────');
  let unresolved = 0;

  for (const [name, ruleType, groupASlug, attrASlug, groupBSlug, attrBSlug, errorMessage, sortOrder] of RULES) {
    const groupA = groupMap[groupASlug];
    const groupB = groupMap[groupBSlug];

    if (!groupA?.id || !groupB?.id) {
      logOp('CREATE', 'CompatibilityRule', name,
        `${ruleType}  ${groupASlug}.${attrASlug} ↔ ${groupBSlug}.${attrBSlug}  (simulated, group IDs virtual)`);
      unresolved++;
      continue;
    }

    // If either group is virtual (created this run), can't query existing
    if (groupA._virtual || groupB._virtual) {
      logOp('CREATE', 'CompatibilityRule', name,
        `${ruleType}  ${groupASlug}.${attrASlug} ↔ ${groupBSlug}.${attrBSlug}  (simulated)`);
      continue;
    }

    const existing = await prisma.compatibilityRule.findFirst({
      where: { ruleType, groupAId: groupA.id, groupBId: groupB.id, attributeASlug: attrASlug, attributeBSlug: attrBSlug },
    });
    if (existing) {
      logOp('SKIP', 'CompatibilityRule', name, `id=${existing.id}`);
    } else {
      logOp('CREATE', 'CompatibilityRule', name,
        `${ruleType}  ${groupASlug}.${attrASlug} ↔ ${groupBSlug}.${attrBSlug}`);
      if (!DRY_RUN) {
        await prisma.compatibilityRule.create({
          data: {
            name, ruleType,
            groupAId: groupA.id, attributeASlug: attrASlug,
            groupBId: groupB.id, attributeBSlug: attrBSlug,
            errorMessage, sortOrder, isActive: true,
            config: { severity: 'error' },
          },
        });
      }
    }
  }
  return unresolved;
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function runCleanup() {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`CLEANUP BUILD PC  ${DRY_RUN ? '[DRY-RUN]' : '[LIVE]'}`);
  console.log(`${'═'.repeat(64)}\n`);

  const seedGroupSlugs = GROUPS.map(g => g[1]);
  const seedAttrSlugs  = NEW_ATTRIBUTES.map(a => a.slug);
  const seedCatSlugs   = NEW_CATEGORIES.map(c => c.slug);
  const seedRuleNames  = RULES.map(r => r[0]);

  console.log('─── CompatibilityRules ───');
  const rules = await prisma.compatibilityRule.findMany({ where: { name: { in: seedRuleNames } } });
  if (!rules.length) console.log('  (none found)');
  for (const r of rules) {
    logOp('DELETE', 'CompatibilityRule', r.name, `id=${r.id}`);
    if (!DRY_RUN) await prisma.compatibilityRule.delete({ where: { id: r.id } });
  }

  console.log('\n─── BuildPcGroups ───');
  const groups = await prisma.buildPcGroup.findMany({
    where: { slug: { in: seedGroupSlugs } },
    include: { _count: { select: { buildItems: true } } },
  });
  if (!groups.length) console.log('  (none found)');
  for (const g of groups) {
    if (g._count.buildItems > 0) {
      logOp('SKIP', 'BuildPcGroup (has items)', g.slug, `buildItems=${g._count.buildItems}`);
    } else {
      logOp('DELETE', 'BuildPcGroup', g.slug, `id=${g.id}`);
      if (!DRY_RUN) await prisma.buildPcGroup.delete({ where: { id: g.id } });
    }
  }

  console.log('\n─── Attributes ───');
  const attrs = await prisma.attribute.findMany({
    where: { slug: { in: seedAttrSlugs } },
    include: { _count: { select: { productValues: true } } },
  });
  if (!attrs.length) console.log('  (none found)');
  for (const a of attrs) {
    if (a._count.productValues > 0) {
      logOp('SKIP', 'Attribute (has product values)', a.slug, `pav=${a._count.productValues}`);
    } else {
      logOp('DELETE', 'Attribute', a.slug, `id=${a.id}`);
      if (!DRY_RUN) await prisma.attribute.delete({ where: { id: a.id } });
    }
  }

  console.log('\n─── Categories ───');
  const cats = await prisma.category.findMany({
    where: { slug: { in: seedCatSlugs } },
    include: { _count: { select: { products: { where: { isDeleted: false } } } } },
  });
  if (!cats.length) console.log('  (none found)');
  for (const c of cats) {
    if (c._count.products > 0) {
      logOp('SKIP', 'Category (has products)', c.slug, `products=${c._count.products}`);
    } else {
      logOp('DELETE', 'Category', c.slug, `id=${c.id}`);
      if (!DRY_RUN) await prisma.category.delete({ where: { id: c.id } });
    }
  }

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`TỔNG KẾT CLEANUP${DRY_RUN ? ' (DRY-RUN — chưa ghi)' : ''}`);
  console.log(`  Xóa: ${stats.deleted}  Bỏ qua: ${stats.skipped}`);
  console.log(`${'═'.repeat(64)}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (CLEANUP) return runCleanup();

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`SEED BUILD PC  ${DRY_RUN ? '[DRY-RUN — chưa ghi vào DB]' : '[LIVE]'}`);
  console.log(`${'═'.repeat(64)}`);

  // ── Load existing data ──────────────────────────────────────────────────────
  const [allCats, allAttrs] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.attribute.findMany({ select: { id: true, slug: true, type: true } }),
  ]);
  const existingCatMap  = Object.fromEntries(allCats.map(c => [c.slug, c]));
  const existingAttrMap = Object.fromEntries(allAttrs.map(a => [a.slug, a]));

  // ── Validate all references before touching DB ──────────────────────────────
  console.log('\n─── Validation ─────────────────────────────────────────────────');
  const errors = await validateRefs(existingCatMap, existingAttrMap);
  if (errors.length) {
    for (const e of errors) console.error('  ' + e);
    console.error(`\nValidation thất bại (${errors.length} lỗi). Không ghi gì vào DB.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log('  Tất cả tham chiếu hợp lệ ✓');

  // ── Seed phases ─────────────────────────────────────────────────────────────
  await seedCategories(existingCatMap);
  await seedAttributes(existingAttrMap);
  await seedAttributeValues(existingAttrMap);
  const groupMap  = await seedGroups(existingCatMap);
  const unresolved = await seedCompatibilityRules(groupMap);

  // ── Slot → Category mapping table ──────────────────────────────────────────
  console.log('\n─── Bảng 20 slot → danh mục ────────────────────────────────────');
  console.log('  #  Slot slug              Category slug(s)         Cat ID(s)');
  console.log('  ─'.repeat(32));
  for (const [i, [, slug, catSlugs]] of GROUPS.entries()) {
    const cats = catSlugs.map(cs => {
      const c = existingCatMap[cs];
      return c ? `${cs}(id=${c.id}${c._virtual ? '*' : ''})` : `${cs}(MISSING)`;
    }).join(', ');
    const num = String(i + 1).padStart(2);
    console.log(`  ${num} ${slug.padEnd(22)} ${cats}`);
  }
  console.log('  (* = virtual ID from this dry-run)');

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`TỔNG KẾT${DRY_RUN ? ' (DRY-RUN — chưa ghi vào DB)' : ''}`);
  console.log(`  Tạo mới:  ${stats.created}`);
  console.log(`  Bỏ qua:   ${stats.skipped}`);
  console.log(`  Cập nhật: ${stats.updated}`);
  console.log(`  Tham chiếu chưa phân giải (simulated): ${unresolved}`);
  console.log(`${'═'.repeat(64)}\n`);
}

main()
  .catch(e => {
    console.error('\nFATAL:', e.message);
    console.error(e.stack?.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
