import { Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const authorize = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: insufficient permissions', 403);
    }
    next();
  };

export const isAdmin = authorize('admin', 'super_admin');
export const isCustomer = authorize('customer');
export const isVendor = authorize('vendor');
export const isServiceVendor = authorize('service_vendor');
export const isVendorAny = authorize('vendor', 'service_vendor');
export const isAnyRole = authorize('customer', 'vendor', 'service_vendor', 'admin', 'super_admin');
