import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { isCustomer } from '../../middleware/rbac';
import { getPagination } from '../../utils/pagination';
import { AuthRequest } from '../../types';
import * as orderSvc from '../orders/orders.service';

const router = Router();

// GET /api/v1/commerce/public/health
router.get('/public/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Cart ─────────────────────────────────────────────────────────────────────

router.get('/cart', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.getCart(req.user!.id)); } catch (e) { next(e); }
});

router.put('/cart', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Replace cart with provided items array
  try {
    await orderSvc.clearCart(req.user!.id);
    const items: Array<{ product_id?: string; service_id?: string; variant_id?: string; qty: number; price: number; tax: number; discount: number; title: string; image?: string }> = req.body.items || [];
    for (const item of items) {
      await orderSvc.addToCart(req.user!.id, item);
    }
    sendSuccess(res, await orderSvc.getCart(req.user!.id));
  } catch (e) { next(e); }
});

router.post('/cart/items', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await orderSvc.addToCart(req.user!.id, req.body)); } catch (e) { next(e); }
});

router.patch('/cart/items/:itemId', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.updateCartItem(req.params.itemId, req.body.qty)); } catch (e) { next(e); }
});

router.delete('/cart/items/:itemId', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await orderSvc.removeCartItem(req.params.itemId); sendSuccess(res, null, 'Removed'); } catch (e) { next(e); }
});

router.delete('/cart', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await orderSvc.clearCart(req.user!.id); sendSuccess(res, null, 'Cart cleared'); } catch (e) { next(e); }
});

router.post('/cart/merge', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Merge guest cart items into authenticated cart
  try {
    const items: Array<{ product_id?: string; service_id?: string; variant_id?: string; qty: number; price: number; tax: number; discount: number; title: string; image?: string }> = req.body.items || [];
    for (const item of items) {
      await orderSvc.addToCart(req.user!.id, item);
    }
    sendSuccess(res, await orderSvc.getCart(req.user!.id));
  } catch (e) { next(e); }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

router.post('/orders', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderSvc.placeOrder({ ...req.body, customer_id: req.user!.id });
    sendCreated(res, order, 'Order placed');
  } catch (e) { next(e); }
});

router.post('/orders/from-cart', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cartItems = await orderSvc.getCart(req.user!.id);
    if (!cartItems.length) {
      return sendSuccess(res, null, 'Cart is empty');
    }
    const items = cartItems.map((ci: any) => ({
      product_id: ci.product_id,
      service_id: ci.service_id,
      variant_id: ci.variant_id,
      qty: ci.qty,
      price: ci.product?.price || ci.service?.price || 0,
      tax: 0,
      discount: 0,
      title: ci.product?.title || ci.service?.title || '',
      image: ci.product?.image || ci.service?.image || '',
    }));
    const order = await orderSvc.placeOrder({
      customer_id: req.user!.id,
      items,
      points_used: req.body.points_used,
      delivery_address: req.body.delivery_address,
      notes: req.body.notes,
    });
    sendCreated(res, order, 'Order placed');
  } catch (e) { next(e); }
});

router.get('/customers/:customerId/orders', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await orderSvc.getCustomerOrders(req.params.customerId, req);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

router.get('/orders/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.getOrder(req.params.id)); } catch (e) { next(e); }
});

router.post('/orders/:id/cancel', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.cancelOrder(req.params.id, req.user!.id), 'Order cancelled'); } catch (e) { next(e); }
});

// ─── Checkout Quote ───────────────────────────────────────────────────────────

router.post('/checkout/quote', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items = [], coupon_code, points_used = 0 } = req.body;
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    for (const item of items) {
      const itemSubtotal = (item.price || 0) * (item.qty || 1);
      subtotal += itemSubtotal;
      taxAmount += (item.tax || 0) * (item.qty || 1);
      discountAmount += (item.discount || 0) * (item.qty || 1);
    }

    let couponDiscount = 0;
    if (coupon_code) {
      const coupon = await prisma.coupon.findUnique({ where: { code: coupon_code.toUpperCase() } });
      if (coupon && coupon.is_active) {
        if (coupon.discount_type === 'percentage') {
          couponDiscount = (subtotal * coupon.discount_value) / 100;
        } else {
          couponDiscount = coupon.discount_value;
        }
      }
    }

    const pointsDiscount = points_used * 0.1;
    const total = Math.max(0, subtotal + taxAmount - discountAmount - couponDiscount - pointsDiscount);

    sendSuccess(res, { subtotal, tax: taxAmount, discount: discountAmount, coupon_discount: couponDiscount, points_discount: pointsDiscount, total });
  } catch (e) { next(e); }
});

// ─── Coupons ──────────────────────────────────────────────────────────────────

router.post('/coupons/validate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, order_amount = 0 } = req.body;
    const coupon = await prisma.coupon.findUnique({ where: { code: (code as string).toUpperCase() } });

    if (!coupon || !coupon.is_active) return sendSuccess(res, { valid: false, message: 'Invalid or expired coupon' });
    if (coupon.expires_at && coupon.expires_at < new Date()) return sendSuccess(res, { valid: false, message: 'Coupon expired' });
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return sendSuccess(res, { valid: false, message: 'Coupon usage limit reached' });
    if (coupon.min_order_value && order_amount < coupon.min_order_value) {
      return sendSuccess(res, { valid: false, message: `Minimum order value ₹${coupon.min_order_value} required` });
    }

    const discountAmount = coupon.discount_type === 'percentage'
      ? (order_amount * coupon.discount_value) / 100
      : coupon.discount_value;

    sendSuccess(res, { valid: true, coupon, discount_amount: discountAmount });
  } catch (e) { next(e); }
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

router.post('/reviews', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    const review = await prisma.review.create({
      data: {
        customer_id: req.user!.id,
        customer_name: customer?.name || '',
        product_id: req.body.product_id,
        service_id: req.body.service_id,
        vendor_id: req.body.vendor_id,
        order_id: req.body.order_id,
        rating: req.body.rating,
        title: req.body.title,
        body: req.body.body,
      },
    });
    sendCreated(res, review, 'Review submitted');
  } catch (e) { next(e); }
});

router.get('/reviews', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { product_id, service_id, vendor_id } = req.query as Record<string, string>;
    const { page, limit, skip } = getPagination(req);

    const where: Record<string, unknown> = {};
    if (product_id) where.product_id = product_id;
    if (service_id) where.service_id = service_id;
    if (vendor_id) where.vendor_id = vendor_id;

    const [data, total] = await Promise.all([
      prisma.review.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
      prisma.review.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

router.get('/reviews/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { product_id, service_id, vendor_id } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (product_id) where.product_id = product_id;
    if (service_id) where.service_id = service_id;
    if (vendor_id) where.vendor_id = vendor_id;

    const result = await prisma.review.aggregate({ where, _avg: { rating: true }, _count: { id: true } });
    sendSuccess(res, { average_rating: result._avg.rating || 0, total_reviews: result._count.id });
  } catch (e) { next(e); }
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

router.post('/bookings', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.serviceBooking.create({
      data: {
        customer_id: req.user!.id,
        service_id: req.body.service_id,
        vendor_id: req.body.vendor_id,
        booked_date: new Date(req.body.booked_date),
        booked_slot: req.body.booked_slot || '',
        notes: req.body.notes,
        amount: req.body.amount,
      },
      include: { service: { select: { title: true, price: true } } },
    });
    sendCreated(res, booking, 'Booking confirmed');
  } catch (e) { next(e); }
});

router.get('/bookings', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const [data, total] = await Promise.all([
      prisma.serviceBooking.findMany({
        where: { customer_id: req.user!.id },
        skip, take: limit,
        orderBy: { created_at: 'desc' },
        include: { service: { select: { title: true, price: true, image: true } } },
      }),
      prisma.serviceBooking.count({ where: { customer_id: req.user!.id } }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

router.get('/bookings/available-slots', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { service_id, date } = req.query as Record<string, string>;
    const slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    if (!service_id || !date) return sendSuccess(res, slots);

    const booked = await prisma.serviceBooking.findMany({
      where: {
        service_id,
        booked_date: new Date(date),
        status: { in: ['pending', 'confirmed'] },
      },
      select: { booked_slot: true },
    });
    const bookedSlots = booked.map((b) => b.booked_slot);
    sendSuccess(res, slots.filter((s) => !bookedSlots.includes(s)));
  } catch (e) { next(e); }
});

router.get('/bookings/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: req.params.id },
      include: { service: true, customer: { select: { name: true, mobile: true } } },
    });
    sendSuccess(res, booking);
  } catch (e) { next(e); }
});

router.post('/bookings/:id/cancel', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.serviceBooking.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });
    sendSuccess(res, booking, 'Booking cancelled');
  } catch (e) { next(e); }
});

export default router;
