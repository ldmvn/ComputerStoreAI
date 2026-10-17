import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/admin.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import * as controller from '../../controllers/adminDashboard.controller.js';

const router = Router();
router.use(authenticateToken, requireAdmin);

router.get('/', requirePermission('dashboard', 'view'), controller.getDashboard);

export default router;
