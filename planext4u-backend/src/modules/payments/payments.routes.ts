import { Router } from 'express';
import * as ctrl from './payments.controller';
import { authenticate } from '../../middleware/auth';
import { isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createPaymentSchema, verifyPaymentSchema, codPlaceOrderSchema } from './payments.schema';
import express from 'express';

const router = Router();

router.post('/create-order',  authenticate, isCustomer, validate(createPaymentSchema), ctrl.createOrder);
router.post('/verify',        authenticate, isCustomer, validate(verifyPaymentSchema), ctrl.verifyPayment);
// Aliases expected by older clients
router.post('/razorpay/create-order', authenticate, isCustomer, validate(createPaymentSchema), ctrl.createOrder);
router.post('/razorpay/verify', authenticate, isCustomer, validate(verifyPaymentSchema), ctrl.verifyPayment);

router.post('/cod/place-order', authenticate, isCustomer, validate(codPlaceOrderSchema), ctrl.placeCodOrder);
router.post('/webhook',       express.raw({ type: 'application/json' }), ctrl.razorpayWebhook);
router.get('/by-order/:orderId', authenticate, ctrl.getByOrder);

// Frontend-compatible aliases
router.post('/intents',        authenticate, isCustomer, validate(createPaymentSchema), ctrl.createOrder);
router.get('/intents/:intentId', authenticate, ctrl.getByOrder);

export default router;
