import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { redis } from '../config/redis';
import { sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return sendError(res, 'No token provided', 401);
  }

  const token = header.split(' ')[1];

  // Check blacklist
  const blacklisted = await redis.get(`blacklist:${token}`);
  if (blacklisted) return sendError(res, 'Token revoked', 401);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, role: payload.role as AuthRequest['user']['role'], email: payload.email, mobile: payload.mobile };
    next();
  } catch {
    return sendError(res, 'Invalid or expired token', 401);
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.id, role: payload.role as AuthRequest['user']['role'] };
    } catch {
      // ignore — optional
    }
  }
  next();
};
