import { Router, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { isVendor } from '../../middleware/rbac';
import { AuthRequest } from '../../types';
import { prisma } from '../../config/database';
import * as vendorSvc from '../vendors/vendors.service';
import * as orderSvc from '../orders/orders.service';
import * as productSvc from '../products/products.service';

const router = Router();

// GET /api/v1/vendor/public/health
router.get('/public/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Vendor Self-service ──────────────────────────────────────────────────────

router.get('/me', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendor(req.user!.id)); } catch (e) { next(e); }
});

// alias: frontend calls /vendor/profile
router.get('/profile', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendor(req.user!.id)); } catch (e) { next(e); }
});

router.patch('/me', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.updateVendor(req.user!.id, req.body)); } catch (e) { next(e); }
});

// ─── Vendor Dashboard ────────────────────────────────────────────────────────

router.get('/dashboard', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendorDashboard(req.user!.id)); } catch (e) { next(e); }
});

// ─── Vendor Products ─────────────────────────────────────────────────────────

router.get('/products', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    (req as any).query.vendor_id = req.user!.id;
    const r = await productSvc.listProducts(req as any);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

// ─── Vendor Settlements ───────────────────────────────────────────────────────

router.get('/settlements', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await orderSvc.getVendorSettlements(req.user!.id, req as any);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

// ─── Vendor Registration ──────────────────────────────────────────────────────

router.post('/register', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await vendorSvc.registerVendor(req.body), 'Vendor registered, pending approval'); } catch (e) { next(e); }
});

router.get('/register/status', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorSvc.getVendor(req.user!.id);
    sendSuccess(res, { status: vendor.status, rejection_reason: vendor.rejection_reason });
  } catch (e) { next(e); }
});

// ─── Vendor Orders ────────────────────────────────────────────────────────────

router.get('/orders', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Inject vendor_id into query for listOrders
    (req as any).query.vendor_id = req.user!.id;
    const r = await orderSvc.listOrders(req as any);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

router.get('/orders/:id', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.getOrder(req.params.id)); } catch (e) { next(e); }
});

router.patch('/orders/:id', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.updateOrderStatus(req.params.id, req.body.status)); } catch (e) { next(e); }
});

// ─── Vendor Reviews ───────────────────────────────────────────────────────────

router.get('/reviews/by-order/:orderId', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { order_id: req.params.orderId },
      orderBy: { created_at: 'desc' },
    });
    sendSuccess(res, reviews);
  } catch (e) { next(e); }
});

export default router;
