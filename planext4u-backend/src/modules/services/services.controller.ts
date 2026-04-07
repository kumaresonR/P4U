import { Request, Response, NextFunction } from 'express';
import * as svc from './services.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const list    = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listServices(req);   sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const browse  = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.browseServices(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const get     = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getService(req.params.id)); } catch (e) { next(e); } };
export const create  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createService({ ...req.body, vendor_id: req.user!.id })); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateService(req.params.id, req.body)); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteService(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };
export const bulkDel = async (req: Request, res: Response, next: NextFunction) => { try { await svc.bulkDeleteServices(req.body.ids); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); } };
export const bulkSts = async (req: Request, res: Response, next: NextFunction) => { try { await svc.bulkUpdateServiceStatus(req.body.ids, req.body.status); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); } };
export const myServices = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const r = await svc.getVendorServices(req.user!.id, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
