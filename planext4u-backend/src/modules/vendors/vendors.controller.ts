import { Request, Response, NextFunction } from 'express';
import * as svc from './vendors.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

// Product vendors
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try { const { data, total, page, limit } = await svc.listVendors(req); sendPaginated(res, data, total, page, limit); } catch (e) { next(e); }
};
export const get = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getVendor(req.params.id)); } catch (e) { next(e); }
};
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getVendor(req.user!.id)); } catch (e) { next(e); }
};
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.registerVendor(req.body), 'Vendor registered, pending approval'); } catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateVendor(req.params.id, req.body)); } catch (e) { next(e); }
};
export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateVendor(req.user!.id, req.body)); } catch (e) { next(e); }
};
export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateVendorStatus(req.params.id, req.body.status, req.body.rejection_reason)); } catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteVendor(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};
export const bulkDelete = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.bulkDeleteVendors(req.body.ids); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); }
};
export const bulkStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.bulkUpdateVendorStatus(req.body.ids, req.body.status); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); }
};
export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Admin hits /:id/dashboard (has req.params.id), vendor hits /me/dashboard (no param)
  try { sendSuccess(res, await svc.getVendorDashboard(req.params.id ?? req.user!.id)); } catch (e) { next(e); }
};
export const updateBank = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateBankDetails(req.user!.id, req.body)); } catch (e) { next(e); }
};

// Service vendors
export const listSvc = async (req: Request, res: Response, next: NextFunction) => {
  try { const { data, total, page, limit } = await svc.listServiceVendors(req); sendPaginated(res, data, total, page, limit); } catch (e) { next(e); }
};
export const getSvc = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getServiceVendor(req.params.id)); } catch (e) { next(e); }
};
export const registerSvc = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.registerServiceVendor(req.body), 'Registration successful'); } catch (e) { next(e); }
};
export const updateSvc = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateServiceVendor(req.params.id, req.body)); } catch (e) { next(e); }
};
export const updateSvcMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateServiceVendor(req.user!.id, req.body)); } catch (e) { next(e); }
};
export const updateSvcStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateServiceVendorStatus(req.params.id, req.body.status)); } catch (e) { next(e); }
};
export const svcDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getServiceVendorDashboard(req.user!.id)); } catch (e) { next(e); }
};
export const updateSvcBank = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateBankDetails(req.user!.id, req.body)); } catch (e) { next(e); }
};
