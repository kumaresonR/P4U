import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import * as adminSvc from '../admin/admin.service';

const router = Router();

// GET /api/v1/content/public/health
router.get('/public/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Banners ──────────────────────────────────────────────────────────────────

router.get('/banners', async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await adminSvc.getActiveBanners()); } catch (e) { next(e); }
});

// ─── Popups ───────────────────────────────────────────────────────────────────

router.get('/popups', async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await adminSvc.getActivePopups()); } catch (e) { next(e); }
});

// ─── Reels (placeholder) ─────────────────────────────────────────────────────

router.get('/reels', (_req: Request, res: Response) => {
  sendSuccess(res, []);
});

// ─── Classifieds ──────────────────────────────────────────────────────────────

router.get('/classified', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ads = await prisma.classifiedAd.findMany({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    sendSuccess(res, ads);
  } catch (e) { next(e); }
});

// ─── Home CMS ────────────────────────────────────────────────────────────────

router.get('/home', async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await adminSvc.getHomesCms('home')); } catch (e) { next(e); }
});

// ─── Brands (placeholder) ────────────────────────────────────────────────────

router.get('/brands', (_req: Request, res: Response) => {
  sendSuccess(res, []);
});

// ─── Featured Products ────────────────────────────────────────────────────────

router.get('/featured-products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { id: true, title: true, price: true, image: true, thumbnail_image: true, rating: true },
    });
    sendSuccess(res, products);
  } catch (e) { next(e); }
});

// ─── Service Highlights ───────────────────────────────────────────────────────

router.get('/service-highlights', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await prisma.service.findMany({
      where: { status: 'active' },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { id: true, title: true, price: true, image: true, rating: true },
    });
    sendSuccess(res, services);
  } catch (e) { next(e); }
});

// ─── Newsletter Subscribe ─────────────────────────────────────────────────────

router.post('/newsletter/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminSvc.subscribeEmail(req.body.email, 'website');
    sendSuccess(res, null, 'Subscribed successfully');
  } catch (e) { next(e); }
});

export default router;
