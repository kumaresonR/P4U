import { Request, Response, NextFunction } from 'express';
import * as svc from './orders.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const list          = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listOrders(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const get           = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getOrder(req.params.id)); } catch (e) { next(e); } };
export const place         = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.placeOrder({ ...req.body, customer_id: req.user!.id }), 'Order placed'); } catch (e) { next(e); } };
export const updateStatus  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateOrderStatus(req.params.id, req.body.status)); } catch (e) { next(e); } };
export const myOrders      = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const r = await svc.getCustomerOrders(req.user!.id, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };

export const listSettlements  = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.listSettlements(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const settleOne        = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.settleSettlement(req.params.id)); } catch (e) { next(e); } };

export const cancelOrder  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.cancelOrder(req.params.id, req.user!.id)); } catch (e) { next(e); } };
export const rateOrder    = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.rateOrder(req.params.id, req.user!.id, req.body.delivery_rating, req.body.rating_comment)); } catch (e) { next(e); } };
export const mySettlements = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const r = await svc.getVendorSettlements(req.user!.id, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };

export const getCart      = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCart(req.user!.id)); } catch (e) { next(e); } };
export const addCart      = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await svc.addToCart(req.user!.id, req.body)); } catch (e) { next(e); } };
export const updateCart   = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateCartItem(req.params.itemId, req.body.qty)); } catch (e) { next(e); } };
export const removeCart   = async (req: Request, res: Response, next: NextFunction) => { try { await svc.removeCartItem(req.params.itemId); sendSuccess(res, null, 'Removed'); } catch (e) { next(e); } };
export const clearCart    = async (req: AuthRequest, res: Response, next: NextFunction) => { try { await svc.clearCart(req.user!.id); sendSuccess(res, null, 'Cart cleared'); } catch (e) { next(e); } };
