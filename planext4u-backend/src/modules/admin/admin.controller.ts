import { Request, Response, NextFunction } from 'express';
import * as svc from './admin.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const dashboard      = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getDashboardStats()); } catch (e) { next(e); } };
export const customerStats  = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCustomerStats()); } catch (e) { next(e); } };

// Reports
export const ordersReport            = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getOrdersReport(req)); } catch (e) { next(e); } };
export const revenueReport           = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getRevenueReport(req)); } catch (e) { next(e); } };
export const customersReport         = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCustomersReport()); } catch (e) { next(e); } };
export const pointsReport            = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getPointsReport()); } catch (e) { next(e); } };
export const vendorPerformanceReport = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getVendorPerformanceReport(req)); } catch (e) { next(e); } };
export const settlementsReport       = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getSettlementsReport(req)); } catch (e) { next(e); } };
export const referralsReport         = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getReferralsReport(req)); } catch (e) { next(e); } };

// Banners
export const getBanners     = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getBanners()); } catch (e) { next(e); } };
export const getActiveBanners = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getActiveBanners()); } catch (e) { next(e); } };
export const createBanner   = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createBanner(req.body)); } catch (e) { next(e); } };
export const updateBanner   = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateBanner(req.params.id, req.body)); } catch (e) { next(e); } };
export const deleteBanner   = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteBanner(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// Ads
export const getAds         = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAdvertisements()); } catch (e) { next(e); } };
export const getActiveAds   = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getActiveAds(req.query.placement as string)); } catch (e) { next(e); } };
export const createAd       = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createAd(req.body)); } catch (e) { next(e); } };
export const updateAd       = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateAd(req.params.id, req.body)); } catch (e) { next(e); } };
export const deleteAd       = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteAd(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// Popups
export const getPopups      = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getPopupBanners()); } catch (e) { next(e); } };
export const getActivePopups = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getActivePopups()); } catch (e) { next(e); } };
export const createPopup    = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createPopup(req.body)); } catch (e) { next(e); } };
export const updatePopup    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updatePopup(req.params.id, req.body)); } catch (e) { next(e); } };
export const deletePopup    = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deletePopup(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// CMS
export const getCmsPages    = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCmsPages()); } catch (e) { next(e); } };
export const getCmsPage     = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCmsPage(req.params.slug)); } catch (e) { next(e); } };
export const createCmsPage  = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createCmsPage(req.body)); } catch (e) { next(e); } };
export const updateCmsPage  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateCmsPage(req.params.id, req.body)); } catch (e) { next(e); } };
export const deleteCmsPage  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteCmsPage(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// Contact / Queries
export const getQueries     = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getWebsiteQueries(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const submitQuery    = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createWebsiteQuery(req.body)); } catch (e) { next(e); } };
export const updateQuery    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateWebsiteQuery(req.params.id, req.body)); } catch (e) { next(e); } };

// Support tickets
export const getTickets     = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getSupportTickets(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const createTicket   = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createSupportTicket(req.user!.id, req.body)); } catch (e) { next(e); } };
export const replyTicket    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.replyToTicket(req.params.id, req.body.reply)); } catch (e) { next(e); } };

// Email subscriptions
export const subscribe      = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.subscribeEmail(req.body.email, req.body.source)); } catch (e) { next(e); } };
export const unsubscribe    = async (req: Request, res: Response, next: NextFunction) => { try { await svc.unsubscribeEmail(req.body.email); sendSuccess(res, null, 'Unsubscribed'); } catch (e) { next(e); } };

// Activity logs
export const listPointsTransactions = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listPointsTransactions(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const listReferrals          = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listReferrals(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };

export const getActivityLogs = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getActivityLogs(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };

// Audit logs
export const getAuditLogs   = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getAuditLogs(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };

// KYC
export const listKyc        = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listKycDocuments(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const reviewKyc      = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.reviewKyc(req.params.id, req.body.status, req.body.rejection_reason, req.body.admin_notes)); } catch (e) { next(e); } };

// Vendor Applications
export const listVendorApps = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listVendorApplications(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const reviewVendorApp = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.reviewVendorApplication(req.params.id, req.body.status, req.body.notes)); } catch (e) { next(e); } };

// Inventory
export const listInventoryLogs = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getInventoryLogs(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const adjustInventory   = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.adjustInventory(req.body.product_id, req.body.variant_id, req.body.change_qty, req.body.reason, req.user!.id)); } catch (e) { next(e); } };

// Onboarding Screens
export const getOnboarding  = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getOnboardingScreens()); } catch (e) { next(e); } };
export const allOnboarding  = async (_: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAllOnboardingScreens()); } catch (e) { next(e); } };
export const createOnboarding = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createOnboardingScreen(req.body)); } catch (e) { next(e); } };
export const updateOnboarding = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateOnboardingScreen(req.params.id, req.body)); } catch (e) { next(e); } };
export const deleteOnboarding = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteOnboardingScreen(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// HomesCMS
export const getHomesCms    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getHomesCms(req.query.type as string)); } catch (e) { next(e); } };
export const allHomesCms    = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getAllHomesCms(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const createHomesCms = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createHomesCms(req.body)); } catch (e) { next(e); } };
export const updateHomesCms = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateHomesCms(req.params.id, req.body)); } catch (e) { next(e); } };
export const deleteHomesCms = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteHomesCms(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// Broadcast / Send Notification
export const broadcastNotif = async (req: Request, res: Response, next: NextFunction) => { try { await svc.adminBroadcast(req.body.title, req.body.body, req.body.role); sendSuccess(res, null, 'Broadcast sent'); } catch (e) { next(e); } };
export const sendNotifToUser = async (req: Request, res: Response, next: NextFunction) => { try { await svc.adminSendToUser(req.body.customer_id, req.body.title, req.body.body, req.body.data); sendSuccess(res, null, 'Notification sent'); } catch (e) { next(e); } };
