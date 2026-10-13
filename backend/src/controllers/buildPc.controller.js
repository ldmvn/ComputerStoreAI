import { getSettings, getSlots, listBuildPcProducts, getBuildPcFacets, validateBuildConfig } from '../services/buildPc.service.js';
import { parseAttributeFilters } from '../validators/product.validator.js';

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function checkEnabled(res) {
  const settings = await getSettings();
  if (settings && !settings.manualBuildEnabled) {
    res.status(503).json({ message: 'Tính năng tự chọn linh kiện đang tạm đóng.' });
    return null;
  }
  return settings;
}

function parseInt(val, fallback) {
  const n = Number.parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBuildPcQuery(query) {
  const brandId = query.brandId === undefined || query.brandId === '' ? undefined : parseInt(query.brandId, undefined);
  const minPrice = query.minPrice === undefined || query.minPrice === '' ? undefined : parseInt(query.minPrice, undefined);
  const maxPrice = query.maxPrice === undefined || query.maxPrice === '' ? undefined : parseInt(query.maxPrice, undefined);
  const attributeFilters = parseAttributeFilters(query);
  const page  = Math.max(parseInt(query.page, 1), 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 20), 1), 50);
  const q = String(query.q || '').trim().substring(0, 100) || undefined;
  const sort = String(query.sort || '').trim() || undefined;
  return { brandId, minPrice, maxPrice, attributeFilters, page, limit, search: q, sort, brand: String(query.brand || '').trim() };
}

export const slots = asyncHandler(async (req, res) => {
  const settings = await checkEnabled(res);
  if (!settings && res.headersSent) return;

  const result = await getSlots();
  res.json({ data: result.slots, meta: result.meta, message: 'OK' });
});

export const products = asyncHandler(async (req, res) => {
  const settings = await checkEnabled(res);
  if (settings === null && res.headersSent) return;

  const slotSlug = String(req.query.slot || '').trim();
  if (!slotSlug) {
    return res.status(400).json({ message: 'Thiếu tham số slot.' });
  }

  const VALID_SORTS = new Set(['default', 'price_asc', 'price_desc', 'name_asc']);
  const sort = String(req.query.sort || '').trim() || 'default';
  if (!VALID_SORTS.has(sort)) {
    return res.status(400).json({ message: `Tham số sort không hợp lệ. Các giá trị hợp lệ: ${[...VALID_SORTS].join(', ')}.` });
  }

  const filters = { ...parseBuildPcQuery(req.query), sort };
  const result = await listBuildPcProducts(slotSlug, filters, settings);
  res.json({ data: result.data, meta: result.meta, message: 'OK' });
});

export const facets = asyncHandler(async (req, res) => {
  const settings = await checkEnabled(res);
  if (settings === null && res.headersSent) return;

  const slotSlug = String(req.query.slot || '').trim();
  if (!slotSlug) {
    return res.status(400).json({ message: 'Thiếu tham số slot.' });
  }

  const filters = parseBuildPcQuery(req.query);
  const result = await getBuildPcFacets(slotSlug, filters, settings);
  res.json({ data: result.data, meta: result.meta, message: 'OK' });
});

export const validateBuild = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  if (settings && !settings.manualBuildEnabled) {
    return res.status(503).json({ message: 'Tính năng tự chọn linh kiện đang tạm đóng.' });
  }

  try {
    const result = await validateBuildConfig(req.body?.items);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Lỗi server.' });
  }
});
