import { Router } from 'express';
import * as ctrl from './customers.controller';
import { authenticate } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { updateCustomerSchema, addAddressSchema, bulkCustomerSchema, bulkCustomerStatusSchema, submitKycSchema } from './customers.schema';

const router = Router();

// Self endpoints (customer)
router.get('/me',                        authenticate, isCustomer, ctrl.getMe);
router.put('/me',                        authenticate, isCustomer, validate(updateCustomerSchema), ctrl.updateMe);
router.get('/me/addresses',              authenticate, isCustomer, ctrl.listAddresses);
router.post('/me/addresses',             authenticate, isCustomer, validate(addAddressSchema), ctrl.addAddress);
router.put('/me/addresses/:addrId',      authenticate, isCustomer, validate(addAddressSchema.partial()), ctrl.editAddress);
router.delete('/me/addresses/:addrId',   authenticate, isCustomer, ctrl.removeAddress);
router.get('/me/wallet',                 authenticate, isCustomer, ctrl.getWallet);
router.get('/me/wishlist',               authenticate, isCustomer, ctrl.getWishlist);
router.post('/me/wishlist/:productId',   authenticate, isCustomer, ctrl.addWishlist);
router.delete('/me/wishlist/:productId', authenticate, isCustomer, ctrl.removeWishlist);
router.get('/me/kyc',                    authenticate, isCustomer, ctrl.getMyKyc);
router.post('/me/kyc',                   authenticate, isCustomer, validate(submitKycSchema), ctrl.submitKyc);

// Admin endpoints
router.post('/',             authenticate, isAdmin, ctrl.create);
router.get('/',              authenticate, isAdmin, ctrl.list);
router.get('/:id',           authenticate, isAdmin, ctrl.get);
router.put('/:id',           authenticate, isAdmin, validate(updateCustomerSchema.partial()), ctrl.update);
router.delete('/:id',        authenticate, isAdmin, ctrl.remove);
router.post('/bulk-delete',  authenticate, isAdmin, validate(bulkCustomerSchema), ctrl.bulkDelete);
router.post('/bulk-status',  authenticate, isAdmin, validate(bulkCustomerStatusSchema), ctrl.bulkStatus);
router.get('/:id/wallet',    authenticate, isAdmin, ctrl.getWallet);
router.get('/:id/addresses', authenticate, isAdmin, ctrl.listAddresses);

export default router;
