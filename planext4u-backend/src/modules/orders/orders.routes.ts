import { Router } from 'express';
import * as ctrl from './orders.controller';
import { authenticate } from '../../middleware/auth';
import { isAdmin, isCustomer, isVendor } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { placeOrderSchema, updateOrderStatusSchema, addCartSchema, updateCartSchema, rateOrderSchema } from './orders.schema';

const router = Router();

// Cart
router.get('/cart',                   authenticate, isCustomer, ctrl.getCart);
router.post('/cart',                  authenticate, isCustomer, validate(addCartSchema),    ctrl.addCart);
router.put('/cart/:itemId',           authenticate, isCustomer, validate(updateCartSchema),  ctrl.updateCart);
router.delete('/cart/:itemId',        authenticate, isCustomer, ctrl.removeCart);
router.delete('/cart',                authenticate, isCustomer, ctrl.clearCart);

// Orders
router.post('/',                      authenticate, isCustomer, validate(placeOrderSchema), ctrl.place);
router.get('/my',                     authenticate, isCustomer, ctrl.myOrders);

// Customer order actions
router.post('/:id/cancel',   authenticate, isCustomer, ctrl.cancelOrder);
router.post('/:id/rate',     authenticate, isCustomer, validate(rateOrderSchema), ctrl.rateOrder);

// Admin & Vendor
router.get('/',                       authenticate, ctrl.list);
router.get('/:id',                    authenticate, ctrl.get);
router.put('/:id/status',             authenticate, validate(updateOrderStatusSchema), ctrl.updateStatus);

// Settlements
router.get('/settlements',            authenticate, isAdmin, ctrl.listSettlements);
router.put('/settlements/:id/settle', authenticate, isAdmin, ctrl.settleOne);
router.get('/my-settlements',         authenticate, isVendor, ctrl.mySettlements);

export default router;
