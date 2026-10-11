import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/admin.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { adminDetail, adminList, categories, create, deleteImage, publicDetail, publicFilters, publicList, publicView, remove, status, update } from '../../controllers/productCatalog.controller.js';
import { listReviews, createReview, deleteReview } from '../../controllers/productReview.controller.js';
import { uploadProductImages } from '../../services/productMedia.service.js';
import { uploadReviewImages } from '../../services/reviewMedia.service.js';

export const publicProductRouter = Router();
publicProductRouter.get('/', publicList);
publicProductRouter.get('/filters', publicFilters);
publicProductRouter.get('/:slug', publicDetail);
publicProductRouter.post('/:slug/views', publicView);
publicProductRouter.get('/:slug/reviews', listReviews);
publicProductRouter.post('/:slug/reviews', authenticateToken, uploadReviewImages, createReview);
publicProductRouter.delete('/:slug/reviews/:reviewId', authenticateToken, deleteReview);

export const adminProductRouter = Router();
adminProductRouter.use(authenticateToken, requireAdmin);
adminProductRouter.get('/categories', requirePermission('products', 'view'), categories);
adminProductRouter.get('/', requirePermission('products', 'view'), adminList);
adminProductRouter.get('/:id', requirePermission('products', 'view'), adminDetail);
adminProductRouter.post('/', requirePermission('products', 'create'), uploadProductImages, create);
adminProductRouter.put('/:id', requirePermission('products', 'update'), uploadProductImages, update);
adminProductRouter.patch('/:id/status', requirePermission('products', 'update'), status);
adminProductRouter.delete('/:id', requirePermission('products', 'delete'), remove);
adminProductRouter.delete('/:id/images/:imageId', requirePermission('products', 'update'), deleteImage);
