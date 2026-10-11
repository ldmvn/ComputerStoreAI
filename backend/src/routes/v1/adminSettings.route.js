import { Router } from 'express';
import { authenticateToken as authenticate } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import * as ctrl from '../../controllers/storeSetting.controller.js';

const router = Router();

router.use(authenticate);

router.get('/',    requirePermission('settings', 'view'),   ctrl.getAll);
router.put('/',    requirePermission('settings', 'manage'), ctrl.update);
router.patch('/',  requirePermission('settings', 'manage'), ctrl.update);

export default router;
