import { prisma } from '../../config/database';
import { getPagination } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler';
import { Request } from 'express';

export const listCustomers = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        city: { select: { name: true } },
        area: { select: { name: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const getCustomer = async (id: string) => {
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      city: { select: { name: true } },
      area: { select: { name: true } },
      addresses: true,
      _count: { select: { orders: true, classifieds: true, properties: true } },
    },
  });
  if (!c) throw new AppError('Customer not found', 404);
  return c;
};

export const updateCustomer = (id: string, data: object) =>
  prisma.customer.update({ where: { id }, data });

export const deleteCustomer = (id: string) =>
  prisma.customer.update({ where: { id }, data: { status: 'inactive' } });

export const bulkDeleteCustomers = (ids: string[]) =>
  prisma.customer.updateMany({ where: { id: { in: ids } }, data: { status: 'inactive' } });

export const bulkUpdateStatus = (ids: string[], status: 'active' | 'inactive' | 'suspended') =>
  prisma.customer.updateMany({ where: { id: { in: ids } }, data: { status } });

// ─── Addresses ────────────────────────────────────────────────────────────────

export const getAddresses = (customerId: string) =>
  prisma.customerAddress.findMany({ where: { customer_id: customerId } });

export const addAddress = (customerId: string, data: object) =>
  prisma.customerAddress.create({
    data: { ...(data as object), customer_id: customerId } as Parameters<typeof prisma.customerAddress.create>[0]['data'],
  });

export const updateAddress = (id: string, data: object) =>
  prisma.customerAddress.update({ where: { id }, data });

export const deleteAddress = (id: string) =>
  prisma.customerAddress.delete({ where: { id } });

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const getWallet = async (customerId: string) => {
  const [customer, transactions] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId }, select: { wallet_points: true } }),
    prisma.pointsTransaction.findMany({
      where: { user_id: customerId },
      orderBy: { created_at: 'desc' },
      take: 50,
    }),
  ]);
  return { balance: customer?.wallet_points ?? 0, transactions };
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const getWishlist = (customerId: string) =>
  prisma.wishlistItem.findMany({
    where: { customer_id: customerId },
    include: {
      product: {
        select: { id: true, title: true, price: true, image: true, thumbnail_image: true, status: true },
      },
    },
  });

export const addToWishlist = (customerId: string, productId: string) =>
  prisma.wishlistItem.upsert({
    where: { customer_id_product_id: { customer_id: customerId, product_id: productId } },
    update: {},
    create: { customer_id: customerId, product_id: productId },
  });

export const removeFromWishlist = (customerId: string, productId: string) =>
  prisma.wishlistItem.deleteMany({ where: { customer_id: customerId, product_id: productId } });

// ─── KYC ─────────────────────────────────────────────────────────────────────

export const submitKyc = async (customerId: string, data: {
  document_type: string; document_number: string;
  front_image_url: string; back_image_url?: string;
}) => {
  const doc = await prisma.kycDocument.create({
    data: { user_id: customerId, ...data, status: 'submitted' },
  });
  await prisma.customer.update({ where: { id: customerId }, data: { kyc_status: 'submitted' } });
  return doc;
};

export const getMyKyc = (customerId: string) =>
  prisma.kycDocument.findMany({ where: { user_id: customerId }, orderBy: { created_at: 'desc' } });
