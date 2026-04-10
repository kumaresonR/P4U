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
router.get('/mine',                  authenticate, isCustomer, ctrl.myOrders); // alias for older clients

// Customer order actions
router.post('/:id/cancel',   authenticate, isCustomer, ctrl.cancelOrder);
router.post('/:id/rate',     authenticate, isCustomer, validate(rateOrderSchema), ctrl.rateOrder);

// Admin & Vendor — static paths before /:id (otherwise "settlements" is treated as an order id)
router.get('/',                       authenticate, ctrl.list);
router.get('/settlements',            authenticate, isAdmin, ctrl.listSettlements);
router.put('/settlements/:id/settle', authenticate, isAdmin, ctrl.settleOne);
router.post('/settlements/bulk-settle', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { ids } = req.body;
    const { prisma } = await import('../../config/database');
    await prisma.settlement.updateMany({ where: { id: { in: ids } }, data: { status: 'settled', settled_at: new Date() } });
    res.json({ success: true, message: 'Settled' });
  } catch (e) { next(e); }
});
router.get('/my-settlements',         authenticate, isVendor, ctrl.mySettlements);
router.get('/:id',                    authenticate, ctrl.get);
router.put('/:id/status',             authenticate, validate(updateOrderStatusSchema), ctrl.updateStatus);

// Bulk operations (admin)
router.post('/bulk-status', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    const { prisma } = await import('../../config/database');
    await prisma.order.updateMany({ where: { id: { in: ids } }, data: { status } });
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
});

export default router;
