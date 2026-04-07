import { Router } from 'express';
import * as ctrl from './services.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isAdmin, isServiceVendor } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createServiceSchema, updateServiceSchema, bulkServiceSchema, bulkServiceStatusSchema } from './services.schema';

const router = Router();

router.get('/browse', optionalAuth, ctrl.browse);
router.get('/:id',    optionalAuth, ctrl.get);

router.get('/vendor/my',        authenticate, isServiceVendor, ctrl.myServices);
router.post('/vendor/my',       authenticate, isServiceVendor, validate(createServiceSchema), ctrl.create);
router.put('/vendor/my/:id',    authenticate, isServiceVendor, validate(updateServiceSchema), ctrl.update);
router.delete('/vendor/my/:id', authenticate, isServiceVendor, ctrl.remove);

router.get('/',             authenticate, isAdmin, ctrl.list);
router.post('/',            authenticate, isAdmin, validate(createServiceSchema), ctrl.create);
router.put('/:id',          authenticate, isAdmin, validate(updateServiceSchema), ctrl.update);
router.delete('/:id',       authenticate, isAdmin, ctrl.remove);
router.post('/bulk-delete', authenticate, isAdmin, validate(bulkServiceSchema), ctrl.bulkDel);
router.post('/bulk-status', authenticate, isAdmin, validate(bulkServiceStatusSchema), ctrl.bulkSts);

export default router;
