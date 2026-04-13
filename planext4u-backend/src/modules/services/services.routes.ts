import { Router } from 'express';
import * as ctrl from './services.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isAdmin, isVendorAny } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createServiceSchema, updateServiceSchema, bulkServiceSchema, bulkServiceStatusSchema } from './services.schema';

const router = Router();

router.get('/browse', optionalAuth, ctrl.browse);

router.get('/vendor/my',        authenticate, isVendorAny, ctrl.myServices);
router.post('/vendor/my',       authenticate, isVendorAny, validate(createServiceSchema), ctrl.create);
router.put('/vendor/my/:id',    authenticate, isVendorAny, validate(updateServiceSchema), ctrl.update);
router.delete('/vendor/my/:id', authenticate, isVendorAny, ctrl.remove);

router.get('/:id', optionalAuth, ctrl.get);

router.get('/',             authenticate, isAdmin, ctrl.list);
router.post('/',            authenticate, isAdmin, validate(createServiceSchema), ctrl.create);
router.put('/:id',          authenticate, isAdmin, validate(updateServiceSchema), ctrl.update);
router.delete('/:id',       authenticate, isAdmin, ctrl.remove);
router.post('/bulk-delete', authenticate, isAdmin, validate(bulkServiceSchema), ctrl.bulkDel);
router.post('/bulk-status', authenticate, isAdmin, validate(bulkServiceStatusSchema), ctrl.bulkSts);

export default router;
