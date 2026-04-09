import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
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

// ─── Customer Home (aggregated) ──────────────────────────────────────────────

router.get('/home', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [banners, categories, featuredProducts, featuredServices, serviceCategories, platformVars] = await Promise.all([
      adminSvc.getActiveBanners(),
      prisma.category.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } }),
      prisma.product.findMany({
        where: { status: 'active' },
        orderBy: { created_at: 'desc' },
        take: 12,
        include: { vendor: { select: { business_name: true } }, category: { select: { name: true } } },
      }),
      prisma.service.findMany({
        where: { status: 'active' },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { vendor: { select: { business_name: true } } },
      }),
      prisma.serviceCategory.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } }),
      prisma.platformVariable.findMany({ where: { key: { startsWith: 'homepage_image_' } } }),
    ]);

    // Build assets map from platform variables
    const assets: Record<string, string> = {};
    for (const v of platformVars) { assets[v.key] = v.value; }

    sendSuccess(res, {
      banners,
      storeBanners: [],
      categories,
      featuredProducts: featuredProducts.map((p: any) => ({
        ...p,
        vendor_name: p.vendor?.business_name || '',
        category_name: p.category?.name || '',
      })),
      featuredServices: featuredServices.map((s: any) => ({
        ...s,
        vendor_name: s.vendor?.business_name || '',
      })),
      serviceCategories,
      assets,
    });
  } catch (e) { next(e); }
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

// Onboarding screens (public) — frontend calls /content/onboarding-screens
router.get('/onboarding-screens', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const screens = await prisma.onboardingScreen.findMany({ where: { is_active: true }, orderBy: { sort_order: 'asc' } });
    sendSuccess(res, screens);
  } catch (e) { next(e); }
});

// Alias for web app (CustomerHomePage)
router.post('/email-subscriptions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!email) throw new AppError('Email is required', 400);
    const source = typeof req.body?.source === 'string' ? req.body.source : 'website';
    await adminSvc.subscribeEmail(email, source);
    sendSuccess(res, null, 'Subscribed successfully');
  } catch (e) { next(e); }
});

export default router;
