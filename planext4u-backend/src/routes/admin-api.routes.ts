/**
 * /api/admin/* routes — expected by the admin web frontend.
 * Thin adapters over existing service functions.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendPaginated } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/rbac';
import { getPagination } from '../utils/pagination';
import * as vendorSvc from '../modules/vendors/vendors.service';
import * as productSvc from '../modules/products/products.service';
import * as serviceSvc from '../modules/services/services.service';
import * as orderSvc from '../modules/orders/orders.service';
import * as masterSvc from '../modules/master/master.service';

const router = Router();
router.use(authenticate, isAdmin);

// ─── Vendors ──────────────────────────────────────────────────────────────────

router.get('/vendors', async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await vendorSvc.listVendors(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); }
});
router.get('/vendors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendor(req.params.id)); } catch (e) { next(e); }
});
router.patch('/vendors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.updateVendor(req.params.id, req.body)); } catch (e) { next(e); }
});
router.delete('/vendors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await vendorSvc.deleteVendor(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// ─── Customers ────────────────────────────────────────────────────────────────

router.get('/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
      prisma.customer.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});
router.get('/customers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.customer.findUnique({ where: { id: req.params.id } });
    sendSuccess(res, c);
  } catch (e) { next(e); }
});
router.patch('/customers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, c);
  } catch (e) { next(e); }
});
router.delete('/customers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.customer.update({ where: { id: req.params.id }, data: { status: 'inactive' } });
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

// ─── Occupations ──────────────────────────────────────────────────────────────

router.get('/occupations', async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await masterSvc.getOccupations()); } catch (e) { next(e); }
});
router.get('/occupations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const o = await prisma.occupation.findUnique({ where: { id: req.params.id } });
    sendSuccess(res, o);
  } catch (e) { next(e); }
});
router.patch('/occupations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await masterSvc.updateOccupation(req.params.id, req.body)); } catch (e) { next(e); }
});
router.delete('/occupations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await masterSvc.deleteOccupation(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// ─── Products ─────────────────────────────────────────────────────────────────

router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await productSvc.listProducts(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); }
});
router.get('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await productSvc.getProduct(req.params.id)); } catch (e) { next(e); }
});
router.patch('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await productSvc.updateProduct(req.params.id, req.body)); } catch (e) { next(e); }
});
router.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await productSvc.deleteProduct(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// ─── Tax Configuration ────────────────────────────────────────────────────────

router.get('/taxconfiguration', async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await masterSvc.getTaxConfigs()); } catch (e) { next(e); }
});

// ─── Categories ───────────────────────────────────────────────────────────────

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await masterSvc.getCategories()); } catch (e) { next(e); }
});
router.get('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.category.findUnique({ where: { id: req.params.id } });
    sendSuccess(res, c);
  } catch (e) { next(e); }
});
router.patch('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await masterSvc.updateCategory(req.params.id, req.body)); } catch (e) { next(e); }
});
router.delete('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await masterSvc.deleteCategory(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// ─── Services ─────────────────────────────────────────────────────────────────

router.get('/services', async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await serviceSvc.listServices(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); }
});
router.get('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await serviceSvc.getService(req.params.id)); } catch (e) { next(e); }
});
router.patch('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await serviceSvc.updateService(req.params.id, req.body)); } catch (e) { next(e); }
});
router.delete('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await serviceSvc.deleteService(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await orderSvc.listOrders(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); }
});
router.get('/orders/individual/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.getOrder(req.params.id)); } catch (e) { next(e); }
});
router.patch('/orders/individual/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.updateOrderStatus(req.params.id, req.body.status)); } catch (e) { next(e); }
});

// ─── Coupons ──────────────────────────────────────────────────────────────────

router.get('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const [data, total] = await Promise.all([
      prisma.coupon.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
      prisma.coupon.count(),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});
router.post('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await prisma.coupon.create({
      data: { ...req.body, code: (req.body.code as string).toUpperCase() },
    });
    sendSuccess(res, coupon, 'Created', 201);
  } catch (e) { next(e); }
});
router.get('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await prisma.coupon.findUnique({ where: { id: req.params.id } })); } catch (e) { next(e); }
});
router.patch('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await prisma.coupon.update({ where: { id: req.params.id }, data: req.body })); } catch (e) { next(e); }
});
router.delete('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.coupon.delete({ where: { id: req.params.id } }); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

router.get('/metadata/all/:filter', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [cities, categories, serviceCategories, taxConfigs, vendorPlans] = await Promise.all([
      prisma.city.findMany({ where: { status: 'active' } }),
      prisma.category.findMany({ where: { status: 'active' } }),
      prisma.serviceCategory.findMany({ where: { status: 'active' } }),
      prisma.taxConfig.findMany(),
      prisma.vendorPlan.findMany({ where: { status: 'active' } }),
    ]);
    sendSuccess(res, { cities, categories, serviceCategories, taxConfigs, vendorPlans });
  } catch (e) { next(e); }
});

// ─── Settlements ──────────────────────────────────────────────────────────────

router.get('/Settlements/allPoints/:filter', async (req: Request, res: Response, next: NextFunction) => {
  try { const r = await orderSvc.listSettlements(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); }
});

export default router;
