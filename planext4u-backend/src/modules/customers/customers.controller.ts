import { Request, Response, NextFunction } from 'express';
import * as svc from './customers.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, total, page, limit } = await svc.listCustomers(req);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
};

export const get = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getCustomer(req.params.id)); } catch (e) { next(e); }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getCustomer(req.user!.id)); } catch (e) { next(e); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.createCustomer(req.body), 'Created', 201); } catch (e) { next(e); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateCustomer(req.params.id, req.body)); } catch (e) { next(e); }
};

export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateCustomer(req.user!.id, req.body)); } catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteCustomer(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

export const bulkDelete = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.bulkDeleteCustomers(req.body.ids); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); }
};

export const bulkStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.bulkUpdateStatus(req.body.ids, req.body.status); sendSuccess(res, null, 'Updated'); } catch (e) { next(e); }
};

export const listAddresses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getAddresses(req.params.id || req.user!.id)); } catch (e) { next(e); }
};

export const addAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.addAddress(req.user!.id, req.body), 'Address added', 201); } catch (e) { next(e); }
};

export const editAddress = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateAddress(req.params.addrId, req.body)); } catch (e) { next(e); }
};

export const removeAddress = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteAddress(req.params.addrId); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

export const getWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getWallet(req.params.id || req.user!.id)); } catch (e) { next(e); }
};

export const getWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getWishlist(req.user!.id)); } catch (e) { next(e); }
};

export const addWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await svc.addToWishlist(req.user!.id, req.params.productId); sendSuccess(res, null, 'Added'); } catch (e) { next(e); }
};

export const removeWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await svc.removeFromWishlist(req.user!.id, req.params.productId); sendSuccess(res, null, 'Removed'); } catch (e) { next(e); }
};

export const submitKyc = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.submitKyc(req.user!.id, req.body), 'KYC submitted'); } catch (e) { next(e); }
};

export const getMyKyc = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getMyKyc(req.user!.id)); } catch (e) { next(e); }
};
