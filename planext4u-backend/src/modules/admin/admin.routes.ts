import { Router } from 'express';
import * as ctrl from './admin.controller';
import { authenticate } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
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
router.post('/contact',          validate(websiteQuerySchema), ctrl.submitQuery);
router.get('/queries',           authenticate, isAdmin, ctrl.getQueries);
router.put('/queries/:id',       authenticate, isAdmin, validate(updateQuerySchema), ctrl.updateQuery);

// Support Tickets
router.post('/support-tickets',      authenticate, isCustomer, validate(createTicketSchema), ctrl.createTicket);
router.get('/support-tickets',       authenticate, isAdmin,    ctrl.getTickets);
router.put('/support-tickets/:id',   authenticate, isAdmin,    validate(replyTicketSchema), ctrl.replyTicket);

// Email Subscriptions
router.post('/subscribe',    validate(emailSubscribeSchema), ctrl.subscribe);
router.post('/unsubscribe',  ctrl.unsubscribe);

// KYC Management
router.get('/kyc',           authenticate, isAdmin, ctrl.listKyc);
router.put('/kyc/:id',       authenticate, isAdmin, validate(kycReviewSchema), ctrl.reviewKyc);

// Vendor Applications
router.get('/vendor-applications',        authenticate, isAdmin, ctrl.listVendorApps);
router.put('/vendor-applications/:id',    authenticate, isAdmin, validate(vendorApplicationReviewSchema), ctrl.reviewVendorApp);

// Inventory
router.get('/inventory/logs',      authenticate, isAdmin, ctrl.listInventoryLogs);
router.post('/inventory/adjust',   authenticate, isAdmin, validate(inventoryAdjustSchema), ctrl.adjustInventory);

// Notifications
router.post('/notify/broadcast',   authenticate, isAdmin, validate(broadcastSchema), ctrl.broadcastNotif);
router.post('/notify/user',        authenticate, isAdmin, validate(sendToUserSchema), ctrl.sendNotifToUser);

// Logs
router.get('/activity-logs', authenticate, isAdmin, ctrl.getActivityLogs);
router.get('/audit-logs',    authenticate, isAdmin, ctrl.getAuditLogs);

// Points transactions (admin list)
router.get('/points-transactions', authenticate, isAdmin, ctrl.listPointsTransactions);

// Referrals (admin list)
router.get('/referrals', authenticate, isAdmin, ctrl.listReferrals);

export default router;
