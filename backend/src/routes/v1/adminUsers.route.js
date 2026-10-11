import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import * as ctrl from '../../controllers/adminUser.controller.js';

const router = Router();
const auth = authenticateToken;
const canView   = requirePermission('administrators', 'view');
const canCreate = requirePermission('administrators', 'create');
const canUpdate = requirePermission('administrators', 'update');
const canManage = requirePermission('administrators', 'manage');

router.get('/',               auth, canView,   ctrl.listAdminUsers);
router.get('/:id',            auth, canView,   ctrl.getAdminUser);
router.post('/',              auth, canCreate, ctrl.createAdminUser);
router.put('/:id',            auth, canUpdate, ctrl.updateAdminUser);
router.patch('/:id/status',   auth, canManage, ctrl.setAdminUserStatus);

export default router;
