import { Router } from 'express';
import * as ctrl from './admin.controller';
import { sendSuccess, sendError } from '../../utils/response';
import { prisma } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimiter';
import { uploadAny } from '../../middleware/upload';
import { uploadFile, deleteFile } from '../../services/storage';
import { AppError } from '../../middleware/errorHandler';
import {
  bannerSchema, adSchema, popupSchema, cmsPageSchema,
  websiteQuerySchema, updateQuerySchema, createTicketSchema,
  replyTicketSchema, broadcastSchema, sendToUserSchema, emailSubscribeSchema,
  kycReviewSchema, vendorApplicationReviewSchema, inventoryAdjustSchema,
  onboardingScreenSchema, homesCmsSchema,
} from './admin.schema';

const router = Router();

// Dashboard
router.get('/dashboard', authenticate, isAdmin, ctrl.dashboard);
router.get('/customer-stats', authenticate, isAdmin, ctrl.customerStats);

// Reports
router.get('/reports/orders',             authenticate, isAdmin, ctrl.ordersReport);
router.get('/reports/revenue',            authenticate, isAdmin, ctrl.revenueReport);
router.get('/reports/customers',          authenticate, isAdmin, ctrl.customersReport);
router.get('/reports/points',             authenticate, isAdmin, ctrl.pointsReport);
router.get('/reports/vendor-performance', authenticate, isAdmin, ctrl.vendorPerformanceReport);
router.get('/reports/settlements',        authenticate, isAdmin, ctrl.settlementsReport);
router.get('/reports/referrals',          authenticate, isAdmin, ctrl.referralsReport);

// Banners (public active, admin CRUD)
router.get('/banners/active',    ctrl.getActiveBanners);
router.get('/banners',           authenticate, isAdmin, ctrl.getBanners);
router.post('/banners',          authenticate, isAdmin, validate(bannerSchema), ctrl.createBanner);
router.put('/banners/:id',       authenticate, isAdmin, validate(bannerSchema.partial()), ctrl.updateBanner);
router.delete('/banners/:id',    authenticate, isAdmin, ctrl.deleteBanner);

// Advertisements
router.get('/ads/active',        ctrl.getActiveAds);
router.get('/ads',               authenticate, isAdmin, ctrl.getAds);
router.post('/ads',              authenticate, isAdmin, validate(adSchema), ctrl.createAd);
router.put('/ads/:id',           authenticate, isAdmin, validate(adSchema.partial()), ctrl.updateAd);
router.delete('/ads/:id',        authenticate, isAdmin, ctrl.deleteAd);

// Popup Banners
router.get('/popups/active',     ctrl.getActivePopups);
router.get('/popups',            authenticate, isAdmin, ctrl.getPopups);
router.post('/popups',           authenticate, isAdmin, validate(popupSchema), ctrl.createPopup);
router.put('/popups/:id',        authenticate, isAdmin, validate(popupSchema.partial()), ctrl.updatePopup);
router.delete('/popups/:id',     authenticate, isAdmin, ctrl.deletePopup);

// CMS Pages
router.get('/cms/:slug',         ctrl.getCmsPage);
router.get('/cms',               authenticate, isAdmin, ctrl.getCmsPages);
router.post('/cms',              authenticate, isAdmin, validate(cmsPageSchema), ctrl.createCmsPage);
router.put('/cms/:id',           authenticate, isAdmin, validate(cmsPageSchema.partial()), ctrl.updateCmsPage);
router.delete('/cms/:id',        authenticate, isAdmin, ctrl.deleteCmsPage);

// Onboarding Screens (public read, admin CRUD)
router.get('/onboarding',           ctrl.getOnboarding);
router.get('/onboarding/all',       authenticate, isAdmin, ctrl.allOnboarding);
router.post('/onboarding',          authenticate, isAdmin, validate(onboardingScreenSchema), ctrl.createOnboarding);
router.put('/onboarding/:id',       authenticate, isAdmin, validate(onboardingScreenSchema.partial()), ctrl.updateOnboarding);
router.delete('/onboarding/:id',    authenticate, isAdmin, ctrl.deleteOnboarding);

// HomesCMS (public read, admin CRUD)
router.get('/homes-cms',            ctrl.getHomesCms);
router.get('/homes-cms/all',        authenticate, isAdmin, ctrl.allHomesCms);
router.post('/homes-cms',           authenticate, isAdmin, validate(homesCmsSchema), ctrl.createHomesCms);
router.put('/homes-cms/:id',        authenticate, isAdmin, validate(homesCmsSchema.partial()), ctrl.updateHomesCms);
router.delete('/homes-cms/:id',     authenticate, isAdmin, ctrl.deleteHomesCms);

// Contact / Queries
router.post('/contact',          authLimiter, validate(websiteQuerySchema), ctrl.submitQuery);
router.get('/queries',           authenticate, isAdmin, ctrl.getQueries);
router.put('/queries/:id',       authenticate, isAdmin, validate(updateQuerySchema), ctrl.updateQuery);

// Support Tickets
router.post('/support-tickets',      authenticate, isCustomer, validate(createTicketSchema), ctrl.createTicket);
router.get('/support-tickets',       authenticate, isAdmin,    ctrl.getTickets);
router.put('/support-tickets/:id',   authenticate, isAdmin,    validate(replyTicketSchema), ctrl.replyTicket);

// Email Subscriptions
router.post('/subscribe',    authLimiter, validate(emailSubscribeSchema), ctrl.subscribe);
router.post('/unsubscribe',  authLimiter, validate(emailSubscribeSchema.pick({ email: true })), ctrl.unsubscribe);

// KYC Management
router.get('/kyc',           authenticate, isAdmin, ctrl.listKyc);
router.put('/kyc/:id',       authenticate, isAdmin, validate(kycReviewSchema), ctrl.reviewKyc);

// Vendor Applications
router.get('/vendor-applications',        authenticate, isAdmin, ctrl.listVendorApps);
router.put('/vendor-applications/:id',    authenticate, isAdmin, validate(vendorApplicationReviewSchema), ctrl.reviewVendorApp);
router.patch('/vendor-applications/reject-by-phone', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { phone, rejection_reason } = req.body as { phone?: string; rejection_reason?: string };
    if (!phone) return sendError(res, 'phone required', 400);
    await prisma.vendorApplication.updateMany({
      where: { mobile: phone },
      data: { status: 'rejected', notes: rejection_reason || '' },
    });
    sendSuccess(res, null, 'Applications updated');
  } catch (e) { next(e); }
});

// Inventory
router.get('/inventory/logs',      authenticate, isAdmin, ctrl.listInventoryLogs);
router.post('/inventory/adjust',   authenticate, isAdmin, validate(inventoryAdjustSchema), ctrl.adjustInventory);

// Notifications
router.post('/notify/broadcast',        authenticate, isAdmin, validate(broadcastSchema), ctrl.broadcastNotif);
router.post('/notify/user',             authenticate, isAdmin, validate(sendToUserSchema), ctrl.sendNotifToUser);
// Alias: frontend calls /admin/notifications/send
router.post('/notifications/send',      authenticate, isAdmin, ctrl.broadcastNotif);

// Logs
router.get('/activity-logs', authenticate, isAdmin, ctrl.getActivityLogs);
router.get('/audit-logs',    authenticate, isAdmin, ctrl.getAuditLogs);

// Points transactions (admin list)
router.get('/points-transactions', authenticate, isAdmin, ctrl.listPointsTransactions);

// Referrals (admin list)
router.get('/referrals', authenticate, isAdmin, ctrl.listReferrals);

// Onboarding screens — alias matching frontend path (/admin/onboarding-screens)
router.get('/onboarding-screens',        ctrl.getOnboarding);
router.get('/onboarding-screens/all',    authenticate, isAdmin, ctrl.allOnboarding);
router.post('/onboarding-screens',       authenticate, isAdmin, validate(onboardingScreenSchema), ctrl.createOnboarding);
router.patch('/onboarding-screens/:id',  authenticate, isAdmin, validate(onboardingScreenSchema.partial()), ctrl.updateOnboarding);
router.delete('/onboarding-screens/:id', authenticate, isAdmin, ctrl.deleteOnboarding);

// Vendor Plans — frontend expects /admin/vendor-plans
router.get('/vendor-plans',        async (req, res, next) => {
  try {
    const where = req.query.is_active !== undefined ? { status: 'active' } : {};
    const plans = await prisma.vendorPlan.findMany({ where: where as any, orderBy: { price: 'asc' } });
    sendSuccess(res, plans);
  } catch (e) { next(e); }
});
router.post('/vendor-plans',       authenticate, isAdmin, async (req, res, next) => {
  try {
    const plan = await prisma.vendorPlan.create({ data: req.body });
    sendSuccess(res, plan, 'Created', 201);
  } catch (e) { next(e); }
});
router.patch('/vendor-plans/:id',  authenticate, isAdmin, async (req, res, next) => {
  try {
    const plan = await prisma.vendorPlan.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, plan);
  } catch (e) { next(e); }
});
router.delete('/vendor-plans/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await prisma.vendorPlan.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

// Product Attributes — frontend expects /admin/product-attributes & /admin/product-attribute-values
router.get('/product-attributes',        authenticate, isAdmin, async (_req, res, next) => {
  try {
    const attrs = await prisma.productAttribute.findMany({ orderBy: { sort_order: 'asc' } });
    sendSuccess(res, attrs);
  } catch (e) { next(e); }
});
router.post('/product-attributes',       authenticate, isAdmin, async (req, res, next) => {
  try {
    const attr = await prisma.productAttribute.create({ data: req.body });
    sendSuccess(res, attr, 'Created', 201);
  } catch (e) { next(e); }
});
router.patch('/product-attributes/:id',  authenticate, isAdmin, async (req, res, next) => {
  try {
    const attr = await prisma.productAttribute.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, attr);
  } catch (e) { next(e); }
});
router.delete('/product-attributes/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await prisma.productAttribute.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

router.get('/product-attribute-values',        authenticate, isAdmin, async (req, res, next) => {
  try {
    const where = req.query.attribute_id ? { attribute_id: String(req.query.attribute_id) } : {};
    const vals = await prisma.productAttributeValue.findMany({ where, orderBy: { sort_order: 'asc' } });
    sendSuccess(res, vals);
  } catch (e) { next(e); }
});
router.post('/product-attribute-values',       authenticate, isAdmin, async (req, res, next) => {
  try {
    const val = await prisma.productAttributeValue.create({ data: req.body });
    sendSuccess(res, val, 'Created', 201);
  } catch (e) { next(e); }
});
router.patch('/product-attribute-values/:id',  authenticate, isAdmin, async (req, res, next) => {
  try {
    const val = await prisma.productAttributeValue.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, val);
  } catch (e) { next(e); }
});
router.delete('/product-attribute-values/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await prisma.productAttributeValue.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

// ─── Media Library ───────────────────────────────────────────────────────────
// List media (optionally filtered by folder)
router.get('/media-library', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { folder, per_page = '200' } = req.query as Record<string, string>;
    const where: any = {};
    if (folder) where.folder = folder;
    const items = await prisma.mediaLibrary.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Math.min(parseInt(per_page) || 200, 2000),
    });
    sendSuccess(res, items);
  } catch (e) { next(e); }
});

// Upload to media library
router.post('/media-library/upload', authenticate, isAdmin, uploadAny.single('file'), async (req: any, res, next) => {
  try {
    if (!req.file) throw new AppError('No file provided', 400);
    const folder = (req.body?.folder as string) || (req.query.folder as string) || 'general';
    const { url, key } = await uploadFile(req.file.buffer, req.file.mimetype, req.file.originalname, folder);
    const isImage = req.file.mimetype.startsWith('image/');
    const media = await prisma.mediaLibrary.create({
      data: {
        file_url: url,
        s3_key: key,
        file_type: isImage ? 'image' : (req.file.mimetype.startsWith('video/') ? 'video' : 'document'),
        file_size: req.file.size,
        file_name: req.file.originalname,
        folder,
        uploaded_by: req.user?.id,
      },
    });
    sendSuccess(res, media, 'Uploaded');
  } catch (e) { next(e); }
});

// Move/rename media (e.g. change folder)
router.patch('/media-library/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const allowed: any = {};
    if (typeof req.body?.folder === 'string') allowed.folder = req.body.folder;
    if (typeof req.body?.alt_text === 'string') allowed.alt_text = req.body.alt_text;
    if (Array.isArray(req.body?.tags)) allowed.tags = req.body.tags;
    const updated = await prisma.mediaLibrary.update({ where: { id: req.params.id }, data: allowed });
    sendSuccess(res, updated, 'Updated');
  } catch (e) { next(e); }
});

// Delete media
router.delete('/media-library/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const media = await prisma.mediaLibrary.findUnique({ where: { id: req.params.id } });
    if (!media) throw new AppError('Media not found', 404);
    if (media.s3_key) {
      try { await deleteFile(media.s3_key); } catch { /* ignore storage errors */ }
    }
    await prisma.mediaLibrary.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

export default router;
