// ============================================================================
// Product Controller — HTTP Layer
// ----------------------------------------------------------------------------
// NGÔN NGỮ DỮ LIỆU: Tiếng Việt (mock data / comments)
// VAI TRÒ: Controller CHỈ làm 3 việc:
//   1. Parse & chuẩn hóa input từ req (query / params / body)
//   2. Gọi service tương ứng
//   3. Format response trả về client
//
// ❌ KHÔNG ĐƯỢC: gọi Prisma trực tiếp, chứa business logic, đọc req.body sâu
// ✅ ĐƯỢC PHÉP: gọi service, throw ApiError thông qua catchAsync
//
// Mọi async handler đều được bọc qua catchAsync() để tự động forward lỗi
// xuống error.middleware.js (global error handler).
// ============================================================================

import { StatusCodes } from 'http-status-codes';
import { productService } from '../services/product.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/response.js';
import { onProductCreated, onProductUpdated, onProductDeleted } from '../ai/rag/sync/knowledgeSync.js';

// ---------------------------------------------------------------------------
// READ — Khách hàng + Admin
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/products
 * Query params:
 *   page, limit, search, type, brand, categoryId,
 *   minPrice, maxPrice, isFeatured, sortBy, sortOrder
 */
const getProducts = catchAsync(async (req, res) => {
  const filters = {
    search: req.query.search,
    type: req.query.type,
    brand: req.query.brand,
    categoryId: req.query.categoryId,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    isFeatured:
      req.query.isFeatured === undefined
        ? undefined
        : req.query.isFeatured === 'true',
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  };

  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 12;

  const result = await productService.getProducts({ ...filters, page, limit });

  return sendSuccess(res, StatusCodes.OK, {
    message: 'Lấy danh sách sản phẩm thành công',
    data: result.items,
    meta: result.meta,
  });
});

/**
 * GET /api/v1/products/featured
 * Query: ?limit=8
 */
const getFeaturedProducts = catchAsync(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 8;
  const products = await productService.getFeaturedProducts(limit);

  return sendSuccess(res, StatusCodes.OK, {
    message: 'Lấy sản phẩm nổi bật thành công',
    data: products,
  });
});

/**
 * GET /api/v1/products/:slug
 * Lấy chi tiết một sản phẩm theo slug
 */
const getProductBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const product = await productService.getProductBySlug(slug);

  return sendSuccess(res, StatusCodes.OK, {
    message: 'Lấy chi tiết sản phẩm thành công',
    data: product,
  });
});

/**
 * GET /api/v1/products/:id/related
 * Sản phẩm liên quan (cùng danh mục)
 */
const getRelatedProducts = catchAsync(async (req, res) => {
  const { id } = req.params;
  const limit = req.query.limit ? Number(req.query.limit) : 4;
  const products = await productService.getRelatedProducts(id, limit);

  return sendSuccess(res, StatusCodes.OK, {
    message: 'Lấy sản phẩm liên quan thành công',
    data: products,
  });
});

// ---------------------------------------------------------------------------
// WRITE — Chỉ Admin
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/products
 * Body: { name, slug, description, brand, type, price, salePrice,
 *         stock, images, specs, categoryId, isFeatured, isActive }
 *
 * Lưu ý: validate body đã được `validate.middleware.js` xử lý trước đó.
 */
const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  onProductCreated(product.id);

  return sendSuccess(res, StatusCodes.CREATED, {
    message: 'Tạo sản phẩm thành công',
    data: product,
  });
});

/**
 * PATCH /api/v1/products/:id
 */
const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const product = await productService.updateProduct(id, req.body);
  onProductUpdated(Number(id));

  return sendSuccess(res, StatusCodes.OK, {
    message: 'Cập nhật sản phẩm thành công',
    data: product,
  });
});

/**
 * DELETE /api/v1/products/:id  (soft delete)
 */
const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await productService.deleteProduct(id);
  onProductDeleted(Number(id));

  return sendSuccess(res, StatusCodes.OK, {
    message: 'Xóa sản phẩm thành công',
    data: result,
  });
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const productController = {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};

export default productController;
