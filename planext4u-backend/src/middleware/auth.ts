import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { redis } from '../config/redis';
import { sendError } from '../utils/response';
import { AuthRequest, AuthUser } from '../types';

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

  // Check blacklist — skip gracefully if Redis is unavailable
  try {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) return sendError(res, 'Token revoked', 401);
  } catch {
    // Redis unavailable — continue without blacklist check
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, role: payload.role as AuthUser['role'], email: payload.email, mobile: payload.mobile };
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
      const blacklisted = await redis.get(`blacklist:${token}`).catch(() => null);
      if (!blacklisted) {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.id, role: payload.role as AuthUser['role'] };
      }
    } catch {
      // ignore — optional
    }
  }
  next();
};
