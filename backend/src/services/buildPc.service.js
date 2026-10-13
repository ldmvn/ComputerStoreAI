import { prisma } from '../config/prisma.js';
import { whereForQuery } from './productCatalog.service.js';
import { resolveBrandFilter } from './brand.service.js';
import { MAX_ITEMS } from '../config/buildPc.config.js';
import { evaluateCompatibility } from './compatibility.service.js';

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings() {
  return prisma.buildPcSettings.findUnique({ where: { id: 1 } });
}

// ── Slots ─────────────────────────────────────────────────────────────────────

export async function getSlots() {
  const [settings, groups] = await Promise.all([
    getSettings(),
    prisma.buildPcGroup.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        categories: {
          include: { category: { select: { id: true, slug: true, name: true } } },
        },
      },
    }),
  ]);
  return {
    slots: groups.map(g => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      isRequired: g.isRequired,
      minCount: g.minCount,
      maxCount: g.maxCount,
      badgeText: g.badgeText,
      exclusiveGroup: g.exclusiveGroup,
      categories: g.categories.map(gc => ({
        id: gc.category.id,
        slug: gc.category.slug,
        name: gc.category.name,
      })),
    })),
    meta: {
      manualBuildEnabled: settings?.manualBuildEnabled ?? true,
      inStockOnly: settings?.inStockOnly ?? true,
    },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function resolveSlot(slug) {
  if (!slug) return null;
  const group = await prisma.buildPcGroup.findFirst({
    where: { slug, isActive: true },
    include: { categories: { select: { categoryId: true } } },
  });
  return group;
}

// Build a base product where clause: active, not deleted, in slot's categories.
// The additional filters (brand/price/attr/search) are merged on top via whereForQuery.
async function buildProductWhere(catIds, filters, resolvedBrand, inStockOnly = false) {
  // whereForQuery handles brand/price/attributeFilters/search; we strip the category-slug
  // path since we supply category IDs directly.
  const filterWithoutCategory = { ...filters, category: undefined, status: undefined };
  const where = await whereForQuery(filterWithoutCategory, resolvedBrand);
  where.categoryId = { in: catIds };
  where.isActive = true;
  where.isDeleted = false;
  if (inStockOnly) where.stockQuantity = { gt: 0 };
  return where;
}

const ORDER_MAP = {
  default:    [{ id: 'asc' }],
  price_asc:  [{ price: 'asc' },  { id: 'asc' }],
  price_desc: [{ price: 'desc' }, { id: 'asc' }],
  name_asc:   [{ name: 'asc' },  { id: 'asc' }],
};

const VALID_SORTS = new Set(Object.keys(ORDER_MAP));

function validateSort(sort) {
  if (sort && !VALID_SORTS.has(sort)) {
    const err = new Error(`Tham số sort không hợp lệ. Các giá trị hợp lệ: ${[...VALID_SORTS].join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function listBuildPcProducts(slotSlug, filters, settings) {
  validateSort(filters.sort);

  const group = await resolveSlot(slotSlug);
  if (!group) {
    const err = new Error('Không tìm thấy slot Build PC.');
    err.statusCode = 404;
    throw err;
  }
  const catIds = group.categories.map(gc => gc.categoryId);
  const inStockOnly = settings?.inStockOnly && !filters.inStockOverride;

  const resolvedBrand = await resolveBrandFilter(filters);
  const where = await buildProductWhere(catIds, filters, resolvedBrand, inStockOnly);

  const page  = Math.max(Number.parseInt(filters.page, 10)  || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(filters.limit, 10) || 20, 1), 50);
  const orderBy = ORDER_MAP[filters.sort] || ORDER_MAP.default;
  const skip = (page - 1) * limit;

  const WARRANTY_SPEC_NAME = 'Bảo hành';

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,
        price: true,
        stockQuantity: true,
        brandRecord: { select: { id: true, name: true } },
        images: {
          where: { isPrimary: true },
          select: { imageUrl: true },
          take: 1,
        },
        specifications: {
          where: { name: WARRANTY_SPEC_NAME },
          select: { value: true },
          take: 1,
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const items = rows.map(p => {
    // Fallback: if no isPrimary image, try any image
    const primaryImage = p.images[0]?.imageUrl ?? null;
    return {
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      price: Number(p.price),
      stockQuantity: p.stockQuantity,
      inStock: p.stockQuantity > 0,
      primaryImage,
      brand: p.brandRecord ? { id: p.brandRecord.id, name: p.brandRecord.name } : null,
      warranty: p.specifications[0]?.value ?? null,
    };
  });

  // Supplement any product where isPrimary image was missing
  const needsImage = items.filter(item => item.primaryImage === null);
  if (needsImage.length) {
    const ids = needsImage.map(item => item.id);
    const fallbacks = await prisma.productImage.findMany({
      where: { productId: { in: ids } },
      select: { productId: true, imageUrl: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      distinct: ['productId'],
    });
    const fallbackMap = new Map(fallbacks.map(f => [f.productId, f.imageUrl]));
    for (const item of items) {
      if (item.primaryImage === null && fallbackMap.has(item.id)) {
        item.primaryImage = fallbackMap.get(item.id);
      }
    }
  }

  return {
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Facets ────────────────────────────────────────────────────────────────────

export async function getBuildPcFacets(slotSlug, filters, settings) {
  const group = await resolveSlot(slotSlug);
  if (!group) {
    const err = new Error('Không tìm thấy slot Build PC.');
    err.statusCode = 404;
    throw err;
  }
  const catIds = group.categories.map(gc => gc.categoryId);
  const inStockOnly = settings?.inStockOnly && !filters.inStockOverride;

  const resolvedBrand = await resolveBrandFilter(filters);

  // Build where with all filters applied (for brand counts and priceRange)
  const whereAll = await buildProductWhere(catIds, filters, resolvedBrand, inStockOnly);

  // For attribute facets: we need per-attribute "exclude-self" where clauses
  const attrFilters = filters.attributeFilters || [];

  // ── Brand counts (facet over all filters) ────────────────────────────────
  const brandGroups = await prisma.product.groupBy({
    by: ['brandId'],
    where: { ...whereAll, brandId: { not: null } },
    _count: { _all: true },
  });
  const brandCountMap = new Map(brandGroups.map(r => [r.brandId, r._count._all]));
  const brandRecords = brandCountMap.size
    ? await prisma.brand.findMany({
        where: { id: { in: [...brandCountMap.keys()] }, isActive: true },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    : [];
  const brands = brandRecords.map(b => ({ id: b.id, name: b.name, count: brandCountMap.get(b.id) || 0 }));

  // ── Price range (base scope only, before price filter) ───────────────────
  const whereForPrice = await buildProductWhere(catIds, { ...filters, minPrice: undefined, maxPrice: undefined }, resolvedBrand, inStockOnly);
  const priceAgg = await prisma.product.aggregate({
    where: whereForPrice,
    _min: { price: true },
    _max: { price: true },
  });

  // ── Attribute facets ─────────────────────────────────────────────────────
  // 1) Find which attributes (SELECT/MULTI_SELECT) are linked to the slot's categories
  const catAttrLinks = await prisma.categoryAttribute.findMany({
    where: {
      categoryId: { in: catIds },
      attribute: { isActive: true, type: { in: ['SELECT', 'MULTI_SELECT'] } },
    },
    include: {
      attribute: {
        include: { values: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { attributeId: 'asc' }],
  });

  // Deduplicate by attributeId
  const seenAttrIds = new Set();
  const uniqueAttrs = [];
  for (const link of catAttrLinks) {
    if (!seenAttrIds.has(link.attributeId)) {
      seenAttrIds.add(link.attributeId);
      uniqueAttrs.push(link.attribute);
    }
  }

  // 2) For each attribute, build "exclude-self" where and count active values
  const attributeFacets = [];
  for (const attr of uniqueAttrs) {
    // Where clause with this attribute's filter removed
    const filtersWithoutThis = {
      ...filters,
      attributeFilters: attrFilters.filter(f => f.slug !== attr.slug),
    };
    const whereExcludeSelf = await buildProductWhere(catIds, filtersWithoutThis, resolvedBrand, inStockOnly);

    const valueGroups = await prisma.productAttributeValue.groupBy({
      by: ['attributeValueId'],
      where: {
        attributeId: attr.id,
        attributeValueId: { not: null },
        product: whereExcludeSelf,
      },
      _count: { _all: true },
    });
    const valueCountMap = new Map(valueGroups.map(r => [r.attributeValueId, r._count._all]));

    const values = attr.values
      .filter(v => valueCountMap.has(v.id))
      .map(v => ({ id: v.id, value: v.value, count: valueCountMap.get(v.id) }));

    if (values.length > 0) {
      attributeFacets.push({ id: attr.id, slug: attr.slug, name: attr.name, type: attr.type, values });
    }
  }

  return {
    data: {
      brands,
      attributes: attributeFacets,
      priceRange: {
        min: priceAgg._min.price !== null ? Number(priceAgg._min.price) : null,
        max: priceAgg._max.price !== null ? Number(priceAgg._max.price) : null,
      },
    },
    meta: {},
  };
}

// ── Validate build configuration ──────────────────────────────────────────

export async function validateBuildConfig(rawItems) {
  // ── Input validation ────────────────────────────────────────────────────
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const err = new Error('items phải là mảng không rỗng.'); err.statusCode = 400; throw err;
  }
  if (rawItems.length > MAX_ITEMS) {
    const err = new Error(`items không được vượt quá ${MAX_ITEMS} dòng.`); err.statusCode = 400; throw err;
  }

  // Load all active groups (1 query)
  const allGroups = await prisma.buildPcGroup.findMany({
    where: { isActive: true },
    include: { categories: { select: { categoryId: true } } },
    orderBy: { sortOrder: 'asc' },
  });
  const groupBySlug  = new Map(allGroups.map(g => [g.slug, g]));
  const groupById    = new Map(allGroups.map(g => [g.id, g]));
  const catIdsBySlug = new Map(allGroups.map(g => [g.slug, new Set(g.categories.map(c => c.categoryId))]));

  const seenSlots    = new Set();
  const exclusiveCount = new Map();

  for (const item of rawItems) {
    if (typeof item.slot !== 'string' || !item.slot) {
      const err = new Error('slot phải là chuỗi không rỗng.'); err.statusCode = 400; throw err;
    }
    const group = groupBySlug.get(item.slot);
    if (!group) {
      const err = new Error(`Slot "${item.slot}" không tồn tại.`); err.statusCode = 400; throw err;
    }
    if (seenSlots.has(item.slot)) {
      const err = new Error(`Slot "${item.slot}" bị trùng.`); err.statusCode = 400; throw err;
    }
    seenSlots.add(item.slot);

    if (!Number.isInteger(item.productId) || item.productId <= 0) {
      const err = new Error('productId phải là số nguyên dương.'); err.statusCode = 400; throw err;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > group.maxCount) {
      const err = new Error(`quantity của slot "${item.slot}" phải từ 1 đến ${group.maxCount}.`); err.statusCode = 400; throw err;
    }
    if (group.exclusiveGroup) {
      exclusiveCount.set(group.exclusiveGroup, (exclusiveCount.get(group.exclusiveGroup) ?? 0) + 1);
    }
  }
  for (const [eg, cnt] of exclusiveCount) {
    if (cnt > 1) {
      const err = new Error(`Chỉ được chọn một slot trong nhóm "${eg}".`); err.statusCode = 400; throw err;
    }
  }

  // ── Load products (2 fixed queries) ─────────────────────────────────────
  const productIds = rawItems.map(i => i.productId);
  const dbProds = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true, slug: true, sku: true, name: true,
      price: true, stockQuantity: true,
      isActive: true, isDeleted: true, categoryId: true,
      attributeValues: {
        include: {
          attribute:      { select: { id: true, slug: true, type: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
      images: { where: { isPrimary: true }, take: 1, select: { imageUrl: true } },
    },
  });
  const prodById = new Map(dbProds.map(p => [p.id, p]));

  // Validate each product
  for (const item of rawItems) {
    const prod = prodById.get(item.productId);
    if (!prod) {
      const err = new Error(`Sản phẩm ${item.productId} không tồn tại.`); err.statusCode = 400; throw err;
    }
    if (!prod.isActive || prod.isDeleted) {
      const err = new Error(`Sản phẩm "${prod.name}" không còn bán.`); err.statusCode = 400; throw err;
    }
    const catIds = catIdsBySlug.get(item.slot);
    if (!catIds || !catIds.has(prod.categoryId)) {
      const err = new Error(`Sản phẩm "${prod.name}" không thuộc slot "${item.slot}".`); err.statusCode = 400; throw err;
    }
  }

  // Fallback images
  const noImage = dbProds.filter(p => p.images.length === 0);
  if (noImage.length) {
    const fallbacks = await prisma.productImage.findMany({
      where: { productId: { in: noImage.map(p => p.id) } },
      select: { productId: true, imageUrl: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      distinct: ['productId'],
    });
    const fbMap = new Map(fallbacks.map(f => [f.productId, f.imageUrl]));
    for (const prod of noImage) {
      if (fbMap.has(prod.id)) prod.images = [{ imageUrl: fbMap.get(prod.id) }];
    }
  }

  // ── Load rules and categories (2 more fixed queries) ────────────────────
  const [rules, catRecords] = await Promise.all([
    prisma.compatibilityRule.findMany({ where: { isActive: true } }),
    prisma.category.findMany({
      where: { id: { in: [...new Set(dbProds.map(p => p.categoryId).filter(Boolean))] } },
      select: { id: true, slug: true },
    }),
  ]);
  const categorySlugById = new Map(catRecords.map(c => [c.id, c.slug]));

  // ── Evaluate ─────────────────────────────────────────────────────────────
  const configItems = rawItems.map(item => ({
    slotSlug: item.slot,
    product:  prodById.get(item.productId),
    quantity: item.quantity,
  }));

  const { issues, missing } = evaluateCompatibility({ configItems, groupById, rules, categorySlugById });

  // ── Build response ────────────────────────────────────────────────────────
  let total = 0;
  const items = rawItems.map(item => {
    const prod      = prodById.get(item.productId);
    const price     = Number(prod.price);
    const lineTotal = price * item.quantity;
    total += lineTotal;
    return {
      slot: item.slot, productId: prod.id,
      slug: prod.slug, sku: prod.sku, name: prod.name,
      price, quantity: item.quantity, lineTotal,
      stockQuantity: prod.stockQuantity,
      primaryImage: prod.images[0]?.imageUrl ?? null,
    };
  });

  const canAddToCart = !issues.some(i => i.level === 'error') && missing.length === 0;

  return { data: { items, total, issues, missing, canAddToCart }, meta: {}, message: 'OK' };
}
