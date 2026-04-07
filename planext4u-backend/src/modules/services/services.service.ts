import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { Request } from 'express';

export const listServices = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, vendor_id, category_id } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendor_id) where.vendor_id = vendor_id;
  if (category_id) where.category_id = category_id;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.service.findMany({
      where, skip, take: limit,
      include: { vendor: { select: { name: true, business_name: true } }, category: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.service.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const browseServices = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, category_id, city, sort = 'newest' } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { status: 'active', is_available: true };
  if (category_id) where.category_id = category_id;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const orderBy =
    sort === 'price_asc'  ? { price: 'asc' as const } :
    sort === 'price_desc' ? { price: 'desc' as const } :
    sort === 'rating'     ? { rating: 'desc' as const } :
    { created_at: 'desc' as const };

  const [data, total] = await Promise.all([
    prisma.service.findMany({ where, skip, take: limit, include: { category: { select: { name: true } } }, orderBy }),
    prisma.service.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const getService = async (id: string) => {
  const s = await prisma.service.findUnique({
    where: { id },
    include: { vendor: { select: { id: true, name: true, business_name: true, rating: true } }, category: true },
  });
  if (!s) throw new AppError('Service not found', 404);
  return s;
};

export const createService = (data: object) =>
  prisma.service.create({ data: data as Parameters<typeof prisma.service.create>[0]['data'] });

export const updateService = (id: string, data: object) =>
  prisma.service.update({ where: { id }, data });

export const deleteService = (id: string) =>
  prisma.service.update({ where: { id }, data: { status: 'inactive' } });

export const bulkDeleteServices = (ids: string[]) =>
  prisma.service.updateMany({ where: { id: { in: ids } }, data: { status: 'inactive' } });

export const bulkUpdateServiceStatus = (ids: string[], status: string) =>
  prisma.service.updateMany({ where: { id: { in: ids } }, data: { status: status as never } });

export const getVendorServices = async (vendorId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.service.findMany({ where: { vendor_id: vendorId }, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.service.count({ where: { vendor_id: vendorId } }),
  ]);
  return { data, total, page, limit };
};
