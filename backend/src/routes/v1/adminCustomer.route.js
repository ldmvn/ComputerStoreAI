import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/admin.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import * as controller from '../../controllers/adminCustomer.controller.js';

const router = Router();
router.use(authenticateToken, requireAdmin);

router.get('/stats', requirePermission('customers', 'view'), controller.stats);
router.get('/', requirePermission('customers', 'view'), controller.list);
router.get('/:id', requirePermission('customers', 'view'), controller.detail);

export default router;
