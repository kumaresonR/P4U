import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: `${prismaErr.meta?.target?.join(', ')} already exists`,
      });
    }
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(env.IS_DEV ? { stack: err.stack } : {}),
  });
};
