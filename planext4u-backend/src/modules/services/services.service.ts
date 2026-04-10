import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { nullifyEmptyStrings, validateFks } from '../../utils/sanitize';
import { normalizeBrowseSort, resolveServiceCategoryIds } from '../../utils/catalogCategoryFilter';
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
  const q = req.query as Record<string, string>;
  const { search, category_id, category: categoryName } = q;
  const sort = normalizeBrowseSort(q.sort);

  const where: Record<string, unknown> = { status: 'active', is_available: true };

  const hadCategoryFilter = !!(category_id || categoryName);
  let catIds: string[] = [];
  if (category_id) {
    catIds = await resolveServiceCategoryIds(category_id);
  } else if (categoryName) {
    catIds = await resolveServiceCategoryIds(categoryName);
  }
  if (hadCategoryFilter) {
    where.category_id = catIds.length > 0 ? { in: catIds } : { in: [] };
  }

  if (search) where.title = { contains: search, mode: 'insensitive' };

  const orderBy =
    sort === 'price_asc'  ? { price: 'asc' as const } :
    sort === 'price_desc' ? { price: 'desc' as const } :
    sort === 'rating'     ? { rating: 'desc' as const } :
    sort === 'popular'    ? { reviews: 'desc' as const } :
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

export const createService = async (data: any) => {
  let clean = nullifyEmptyStrings(data, ['vendor_id', 'category_id']);
  if (!clean.vendor_id) throw new AppError('vendor_id is required to create a service', 400);

  const vendor = await prisma.vendor.findUnique({ where: { id: clean.vendor_id } });
  if (!vendor) throw new AppError('Selected vendor not found', 400);

  if (clean.category_id) {
    const cat = await prisma.serviceCategory.findUnique({ where: { id: clean.category_id } });
    if (!cat) clean.category_id = null;
  }

  return prisma.service.create({ data: clean });
};

export const updateService = async (id: string, data: any) => {
  let clean = nullifyEmptyStrings(data, ['category_id']);
  clean = await validateFks(clean, { category_id: 'serviceCategory' });
  return prisma.service.update({ where: { id }, data: clean });
};

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
