import { Request } from 'express';
import { PAGINATION } from '../config/constants';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPagination = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE);
  // Accept both `limit` and `per_page` (frontend uses per_page convention)
  const rawLimit = parseInt((req.query.limit ?? req.query.per_page) as string);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    rawLimit || PAGINATION.DEFAULT_LIMIT
  );
  return { page, limit, skip: (page - 1) * limit };
};
