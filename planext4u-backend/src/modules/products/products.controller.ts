import { Request, Response, NextFunction } from 'express';
import * as svc from './products.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const list    = async (req: Request, res: Response, next: NextFunction) => { try { const { data, total, page, limit } = await svc.listProducts(req);   sendPaginated(res, data, total, page, limit); } catch (e) { next(e); } };
export const browse  = async (req: Request, res: Response, next: NextFunction) => { try { const { data, total, page, limit } = await svc.browseProducts(req); sendPaginated(res, data, total, page, limit); } catch (e) { next(e); } };
export const get     = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getProduct(req.params.id)); } catch (e) { next(e); } };
export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.createProduct({ ...req.body, vendor_id: (req as AuthRequest).user?.id || req.body.vendor_id })); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateProduct(req.params.id, req.body)); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteProduct(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };
export const bulkDel = async (req: Request, res: Response, next: NextFunction) => { try { await svc.bulkDeleteProducts(req.body.ids); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); } };
export const bulkSts = async (req: Request, res: Response, next: NextFunction) => { try { await svc.bulkUpdateProductStatus(req.body.ids, req.body.status); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); } };
export const myProducts = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const { data, total, page, limit } = await svc.getVendorProducts(req.user!.id, req); sendPaginated(res, data, total, page, limit); } catch (e) { next(e); } };

// Variants
export const addVariant    = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.addVariant(req.params.id, req.body)); } catch (e) { next(e); } };
export const updateVariant = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateVariant(req.params.variantId, req.body)); } catch (e) { next(e); } };
export const removeVariant = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteVariant(req.params.variantId); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };
