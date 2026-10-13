import { Router } from 'express';
import { slots, products, facets, validateBuild } from '../../controllers/buildPc.controller.js';

const router = Router();

router.get('/slots',    slots);
router.get('/products', products);
router.get('/facets',   facets);
router.post('/validate', validateBuild);

export default router;
