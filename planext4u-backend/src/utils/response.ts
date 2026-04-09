import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: ApiResponse['meta']
) => {
  const response: ApiResponse<T> = { success: true, message, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message = 'Created') =>
  sendSuccess(res, data, message, 201);

export const sendError = (
  res: Response,
  error: string,
  statusCode = 400,
  details?: unknown
) => {
  const response: ApiResponse = { success: false, error };
  if (details) (response as unknown as Record<string, unknown>).details = details;
  return res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
) =>
  sendSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  });
