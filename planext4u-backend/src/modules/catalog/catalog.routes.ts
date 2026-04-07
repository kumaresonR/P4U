import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import * as productSvc from '../products/products.service';
import * as serviceSvc from '../services/services.service';
import * as vendorSvc from '../vendors/vendors.service';

const router = Router();

// GET /api/v1/catalog/public/health
router.get('/public/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Categories ───────────────────────────────────────────────────────────────

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, categories);
  } catch (e) { next(e); }
});

router.get('/categories/:id/children', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const children = await prisma.category.findMany({
      where: { parent_id: req.params.id, status: 'active' },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, children);
  } catch (e) { next(e); }
});

// ─── Products ─────────────────────────────────────────────────────────────────

router.get('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await productSvc.getProduct(req.params.id)); } catch (e) { next(e); }
});

// ─── Services ─────────────────────────────────────────────────────────────────

router.get('/services', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await serviceSvc.browseServices(req);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

router.get('/services/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await serviceSvc.getService(req.params.id)); } catch (e) { next(e); }
});

// ─── Vendors ──────────────────────────────────────────────────────────────────

router.get('/vendors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await vendorSvc.listVendors(req);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

router.get('/vendors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendor(req.params.id)); } catch (e) { next(e); }
});

router.get('/vendors/:id/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await productSvc.getVendorProducts(req.params.id, req);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

// ─── Search ───────────────────────────────────────────────────────────────────

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    const { page, limit, skip } = getPagination(req);

    const [products, services] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: 'active',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        skip,
        select: { id: true, title: true, price: true, image: true, thumbnail_image: true },
      }),
      prisma.service.findMany({
        where: {
          status: 'active',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        skip,
        select: { id: true, title: true, price: true, image: true },
      }),
    ]);

    sendSuccess(res, { products, services, query: q, page, limit });
  } catch (e) { next(e); }
});

export default router;
