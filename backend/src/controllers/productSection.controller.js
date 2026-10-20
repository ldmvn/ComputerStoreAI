import {
  addProducts,
  createSection,
  deleteSection,
  getHomeSections,
  getSection,
  listSections,
  removeProduct,
  reorderProducts,
  reorderSections,
  saveQuickFilterConfig,
  searchProducts,
  setSectionStatus,
  updateSection,
} from '../services/productSection.service.js';
import { productId, sectionId, validateProductIds, validateQuickFilterConfig, validateReorderIds, validateSection } from '../validators/productSection.validator.js';

const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

export const home = asyncHandler(async (_req, res) => res.json({ sections: await getHomeSections() }));
export const list = asyncHandler(async (_req, res) => res.json({ sections: await listSections() }));
export const detail = asyncHandler(async (req, res) => res.json({ section: await getSection(sectionId(req.params.id)) }));
export const sectionProducts = asyncHandler(async (req, res) => res.json({ products: (await getSection(sectionId(req.params.id))).products }));
export const products = asyncHandler(async (req, res) => res.json({ products: await searchProducts(req.query.search) }));
export const create = asyncHandler(async (req, res) => res.status(201).json({ section: await createSection(validateSection(req.body)), message: 'Đã tạo khối sản phẩm.' }));
export const update = asyncHandler(async (req, res) => res.json({ section: await updateSection(sectionId(req.params.id), validateSection(req.body)), message: 'Đã cập nhật khối sản phẩm.' }));
export const remove = asyncHandler(async (req, res) => { await deleteSection(sectionId(req.params.id)); res.json({ message: 'Đã xóa khối sản phẩm.' }); });
export const status = asyncHandler(async (req, res) => {
  const value = req.body?.isActive === true || req.body?.isActive === 'true';
  res.json({ section: await setSectionStatus(sectionId(req.params.id), value), message: value ? 'Đã bật khối sản phẩm.' : 'Đã tắt khối sản phẩm.' });
});
export const add = asyncHandler(async (req, res) => res.json({ section: await addProducts(sectionId(req.params.id), validateProductIds(req.body)), message: 'Đã thêm sản phẩm vào khối.' }));
export const removeItem = asyncHandler(async (req, res) => res.json({ section: await removeProduct(sectionId(req.params.id), productId(req.params.productId)), message: 'Đã xóa sản phẩm khỏi khối.' }));
export const reorderItems = asyncHandler(async (req, res) => res.json({ section: await reorderProducts(sectionId(req.params.id), validateReorderIds(req.body, 'sản phẩm')), message: 'Đã lưu thứ tự sản phẩm.' }));
export const reorder = asyncHandler(async (req, res) => res.json({ sections: await reorderSections(validateReorderIds(req.body, 'khối').map(Number)), message: 'Đã lưu thứ tự khối.' }));
export const quickFilter = asyncHandler(async (req, res) => res.json({ section: await saveQuickFilterConfig(sectionId(req.params.id), validateQuickFilterConfig(req.body)), message: 'Đã lưu cấu hình Quick Filter.' }));
