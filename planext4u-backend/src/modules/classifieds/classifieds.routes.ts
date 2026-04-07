import { Router } from 'express';
import * as ctrl from './classifieds.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createClassifiedSchema, updateClassifiedSchema, updateClassifiedStatusSchema } from './classifieds.schema';

const router = Router();

router.get('/browse',      optionalAuth, ctrl.browse);
router.get('/my',          authenticate, isCustomer, ctrl.myAds);
router.post('/',           authenticate, isCustomer, validate(createClassifiedSchema), ctrl.create);
router.put('/:id',         authenticate, validate(updateClassifiedSchema), ctrl.update);
router.delete('/:id',      authenticate, ctrl.remove);
router.get('/:id',         optionalAuth, ctrl.get);

// Admin
router.get('/',                  authenticate, isAdmin, ctrl.list);
router.put('/:id/status',        authenticate, isAdmin, validate(updateClassifiedStatusSchema), ctrl.updateStatus);

export default router;
