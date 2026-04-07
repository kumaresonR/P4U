import { Request } from 'express';

export interface AuthUser {
  id: string;
  role: 'customer' | 'vendor' | 'service_vendor' | 'admin' | 'super_admin';
  email?: string;
  mobile?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export type VendorType = 'product' | 'service';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
