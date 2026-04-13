import { Router } from 'express';
import * as ctrl from './products.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isAdmin, isVendor } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createProductSchema, updateProductSchema, createVariantSchema, bulkActionSchema, bulkStatusSchema } from './products.schema';

const router = Router();

// Public browse
router.get('/browse', optionalAuth, ctrl.browse);

// Vendor self (must be before /:id so "vendor" is not captured as a product id)
router.get('/vendor/my',         authenticate, isVendor, ctrl.myProducts);
router.post('/vendor/my',        authenticate, isVendor, validate(createProductSchema), ctrl.create);
router.put('/vendor/my/:id',     authenticate, isVendor, validate(updateProductSchema), ctrl.update);
router.delete('/vendor/my/:id',  authenticate, isVendor, ctrl.remove);

// Vendor variants
router.delete('/vendor/my/:id/variants', authenticate, isVendor, ctrl.deleteAllVariantsVendor);
router.post('/vendor/my/:id/variants',              authenticate, isVendor, validate(createVariantSchema), ctrl.addVariant);
router.put('/vendor/my/:id/variants/:variantId',    authenticate, isVendor, validate(createVariantSchema.partial()), ctrl.updateVariant);
router.delete('/vendor/my/:id/variants/:variantId', authenticate, isVendor, ctrl.removeVariant);

// Admin + shared read — variant APIs (before GET /:id)
router.get('/:id/variants', optionalAuth, ctrl.listVariants);
router.post('/:id/variants', authenticate, isAdmin, validate(createVariantSchema), ctrl.addVariant);
router.delete('/:id/variants', authenticate, isAdmin, ctrl.deleteAllVariantsAdmin);

router.get('/:id', optionalAuth, ctrl.get);

// Admin
router.get('/',             authenticate, isAdmin, ctrl.list);
router.post('/',            authenticate, isAdmin, validate(createProductSchema), ctrl.create);
router.put('/:id',          authenticate, isAdmin, validate(updateProductSchema), ctrl.update);
router.delete('/:id',       authenticate, isAdmin, ctrl.remove);
router.post('/bulk-delete', authenticate, isAdmin, validate(bulkActionSchema), ctrl.bulkDel);
router.post('/bulk-status', authenticate, isAdmin, validate(bulkStatusSchema), ctrl.bulkSts);

export default router;
