import { Request, Response, NextFunction } from 'express';
import * as svc from './properties.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const search        = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.searchProperties(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const adminList     = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listPropertiesAdmin(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const get           = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getProperty(req.params.id)); } catch (e) { next(e); } };
export const create        = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createProperty(req.user!.id, req.body)); } catch (e) { next(e); } };
export const update        = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateProperty(req.params.id, req.body)); } catch (e) { next(e); } };
export const updateStatus  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updatePropertyStatus(req.params.id, req.body.status)); } catch (e) { next(e); } };
export const remove        = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteProperty(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };
export const myProperties  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const r = await svc.getUserProperties(req.user!.id, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };

export const getMessages   = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getPropertyMessages(req.params.id)); } catch (e) { next(e); } };
export const sendMessage   = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.sendPropertyMessage(req.params.id, req.user!.id, req.body.message)); } catch (e) { next(e); } };

export const getSavedSearches  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getSavedSearches(req.user!.id)); } catch (e) { next(e); } };
export const saveSearch        = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createSavedSearch(req.user!.id, req.body.name, req.body.filters)); } catch (e) { next(e); } };
export const deleteSearch      = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteSavedSearch(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

export const getRentTrackers   = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getRentTrackers(req.user!.id)); } catch (e) { next(e); } };
export const createRentTracker = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createRentTracker(req.user!.id, req.body)); } catch (e) { next(e); } };
export const addRentPayment    = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.addRentPayment(req.params.trackerId, req.body)); } catch (e) { next(e); } };

export const emiCalc = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { principal, rate, tenure } = req.body;
    sendSuccess(res, svc.calculateEmi(principal, rate, tenure));
  } catch (e) { next(e); }
};

// Bookmarks
export const bookmark       = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.toggleBookmark(req.params.id, req.user!.id)); } catch (e) { next(e); } };
export const myBookmarks    = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getBookmarks(req.user!.id)); } catch (e) { next(e); } };

// Enquiries
export const createEnquiry  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createEnquiry(req.params.id, req.user!.id, req.body.message)); } catch (e) { next(e); } };
export const getEnquiries   = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getEnquiries(req.params.id)); } catch (e) { next(e); } };
export const updateEnquiry  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateEnquiryStatus(req.params.enquiryId, req.body.status)); } catch (e) { next(e); } };

// Visits
export const scheduleVisit  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.scheduleVisit(req.params.id, req.user!.id, req.body.scheduled_at, req.body.notes)); } catch (e) { next(e); } };
export const getVisits      = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getVisits(req.params.id)); } catch (e) { next(e); } };
export const updateVisit    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateVisitStatus(req.params.visitId, req.body.status)); } catch (e) { next(e); } };

// Reports
export const report         = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.reportProperty(req.params.id, req.user!.id, req.body.reason, req.body.description)); } catch (e) { next(e); } };
export const allReports     = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getReports(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
