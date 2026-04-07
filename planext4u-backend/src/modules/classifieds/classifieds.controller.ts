import { Request, Response, NextFunction } from 'express';
import * as svc from './classifieds.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const list   = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listClassifieds(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const browse = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.browseClassifieds(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const get    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getClassified(req.params.id)); } catch (e) { next(e); } };
export const create = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createClassified(req.user!.id, req.body)); } catch (e) { next(e); } };
export const update = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateClassified(req.params.id, req.body)); } catch (e) { next(e); } };
export const updateStatus = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateClassifiedStatus(req.params.id, req.body.status)); } catch (e) { next(e); } };
export const remove = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteClassified(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };
export const myAds  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const r = await svc.getUserClassifieds(req.user!.id, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
