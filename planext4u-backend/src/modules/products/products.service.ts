import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { nullifyEmptyStrings, validateFks } from '../../utils/sanitize';
import { normalizeBrowseSort, resolveProductCategoryIds } from '../../utils/catalogCategoryFilter';
import { Request } from 'express';

const productInclude = {
  vendor: { select: { id: true, name: true, business_name: true } },
  category: { select: { id: true, name: true } },
  variants: true,
};

export const listProducts = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, vendor_id, category_id } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendor_id) where.vendor_id = vendor_id;
  if (category_id) where.category_id = category_id;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limit, include: productInclude, orderBy: { created_at: 'desc' } }),
    prisma.product.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const browseProducts = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const q = req.query as Record<string, string>;
  const { search, category_id, category: categoryName, min_price, max_price } = q;
  const sort = normalizeBrowseSort(q.sort);

  const where: Record<string, unknown> = { status: 'active', is_available: true };

  const hadCategoryFilter = !!(category_id || categoryName);
  let catIds: string[] = [];
  if (category_id) {
    catIds = await resolveProductCategoryIds(category_id);
  } else if (categoryName) {
    catIds = await resolveProductCategoryIds(categoryName);
  }
  if (hadCategoryFilter) {
    where.category_id = catIds.length > 0 ? { in: catIds } : { in: [] };
  }

  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (min_price || max_price) {
    where.price = {
      ...(min_price ? { gte: parseFloat(min_price) } : {}),
      ...(max_price ? { lte: parseFloat(max_price) } : {}),
    };
  }

  const orderBy =
    sort === 'price_asc' ? { price: 'asc' as const } :
    sort === 'price_desc' ? { price: 'desc' as const } :
    sort === 'rating' ? { rating: 'desc' as const } :
    sort === 'popular' ? { sales: 'desc' as const } :
    { created_at: 'desc' as const };

  const [data, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limit, include: { category: { select: { name: true } }, variants: true }, orderBy }),
    prisma.product.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const getProduct = async (id: string) => {
  const p = await prisma.product.findUnique({
    where: { id },
    include: { ...productInclude, attributeMap: { include: { attribute: { include: { values: true } } } } },
  });
  if (!p) throw new AppError('Product not found', 404);
  return p;
};

export const createProduct = async (data: any) => {
  let clean = nullifyEmptyStrings(data, ['category_id', 'subcategory_id', 'tax_slab_id', 'vendor_id']);
  clean = await validateFks(clean, {
    vendor_id: 'vendor',
    category_id: 'category',
    tax_slab_id: 'taxSlab',
  });
  if (!clean.vendor_id) throw new AppError('vendor_id is required to create a product', 400);
  return prisma.product.create({ data: clean, include: productInclude });
};

export const updateProduct = async (id: string, data: any) => {
  let clean = nullifyEmptyStrings(data, ['category_id', 'subcategory_id', 'tax_slab_id']);
  clean = await validateFks(clean, {
    category_id: 'category',
    tax_slab_id: 'taxSlab',
  });
  return prisma.product.update({ where: { id }, data: clean, include: productInclude });
};

export const deleteProduct = (id: string) =>
  prisma.product.update({ where: { id }, data: { status: 'inactive' } });

export const bulkDeleteProducts = (ids: string[]) =>
  prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: 'inactive' } });

export const bulkUpdateProductStatus = (ids: string[], status: string) =>
  prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: status as never } });

// Variants
export const addVariant = (productId: string, data: object) =>
  prisma.productVariant.create({ data: { ...(data as object), product_id: productId } as Parameters<typeof prisma.productVariant.create>[0]['data'] });

export const updateVariant = (id: string, data: object) =>
  prisma.productVariant.update({ where: { id }, data });

export const deleteVariant = (id: string) => prisma.productVariant.delete({ where: { id } });

// Vendor products
export const getVendorProducts = async (vendorId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.product.findMany({ where: { vendor_id: vendorId }, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.product.count({ where: { vendor_id: vendorId } }),
  ]);
  return { data, total, page, limit };
};
