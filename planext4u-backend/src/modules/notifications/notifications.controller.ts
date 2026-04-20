import { Request, Response, NextFunction } from 'express';
import * as svc from './notifications.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types';

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { const r = await svc.getMyNotifications(req.user!.id, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); }
};
export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.markRead(req.params.id)); } catch (e) { next(e); }
};
export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await svc.markAllRead(req.user!.id); sendSuccess(res, null, 'All marked read'); } catch (e) { next(e); }
};
export const unreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, { count: await svc.getUnreadCount(req.user!.id) }); } catch (e) { next(e); }
};
export const sendBroadcast = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.broadcast(req.body.title, req.body.body, req.body.role); sendSuccess(res, null, 'Broadcast sent'); } catch (e) { next(e); }
};
export const sendToUser = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.sendToUser(req.body.customer_id, req.body.title, req.body.body, req.body.data); sendSuccess(res, null, 'Sent'); } catch (e) { next(e); }
};
const ALLOWED_DEVICE_TYPES = ['android', 'ios', 'web'];
export const registerDevice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fcm_token, device_type } = req.body;
    if (typeof fcm_token !== 'string' || fcm_token.trim().length < 20) {
      throw new AppError('A valid fcm_token is required', 400);
    }
    if (device_type && !ALLOWED_DEVICE_TYPES.includes(device_type)) {
      throw new AppError(`device_type must be one of: ${ALLOWED_DEVICE_TYPES.join(', ')}`, 400);
    }
    if (req.user) {
      const { registerFcmToken } = await import('../auth/auth.service');
      await registerFcmToken(req.user.id, req.user.role, fcm_token);
    }
    sendSuccess(res, null, 'Device registered');
  } catch (e) { next(e); }
};
