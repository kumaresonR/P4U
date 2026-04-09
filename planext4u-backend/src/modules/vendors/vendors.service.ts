import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/password';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { sendVendorApproval } from '../../services/email';
import { Request } from 'express';

const vendorSelect = {
  id: true, name: true, business_name: true, email: true, mobile: true,
  avatar: true, status: true, rating: true, total_products: true,
  total_orders: true, total_revenue: true, commission_rate: true,
  gst_number: true, pan_number: true, kyc_status: true,
  city: { select: { name: true } }, area: { select: { name: true } },
  category: { select: { name: true } }, plan: true, created_at: true,
};

// ─── Product Vendors ──────────────────────────────────────────────────────────

export const listVendors = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { business_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.vendor.findMany({ where, skip, take: limit, select: vendorSelect, orderBy: { created_at: 'desc' } }),
    prisma.vendor.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const getVendor = async (id: string) => {
  const v = await prisma.vendor.findUnique({ where: { id }, include: { category: true, city: true, area: true, plan: true } });
  if (!v) throw new AppError('Vendor not found', 404);
  return v;
};

export const registerVendor = async (data: {
  name: string; business_name: string; email: string; mobile: string; password?: string;
  category_id?: string; city_id?: string; area_id?: string;
}) => {
  const exists = await prisma.vendor.findFirst({ where: { OR: [{ email: data.email }, { mobile: data.mobile }] } });
  if (exists) throw new AppError('Email or mobile already registered', 409);

  const { password, ...rest } = data;
  const plainPassword = password || Math.random().toString(36).slice(-10) + 'P4u!';
  return prisma.vendor.create({
    data: { ...rest, password_hash: await hashPassword(plainPassword) },
  });
};

export const updateVendor = (id: string, data: object) =>
  prisma.vendor.update({ where: { id }, data });

export const updateVendorStatus = async (id: string, status: string, rejection_reason?: string) => {
  const vendor = await prisma.vendor.update({ where: { id }, data: { status: status as never, rejection_reason } });
  if (status === 'verified') await sendVendorApproval(vendor.email, vendor.name);
  return vendor;
};

export const deleteVendor = (id: string) =>
  prisma.vendor.update({ where: { id }, data: { status: 'rejected' } });

export const getVendorDashboard = async (id: string) => {
  const [vendor, recentOrders, settlements] = await Promise.all([
    prisma.vendor.findUnique({ where: { id } }),
    prisma.order.findMany({
      where: { vendor_id: id },
      take: 10,
      orderBy: { created_at: 'desc' },
      include: { customer: { select: { name: true } }, orderItems: true },
    }),
    prisma.settlement.findMany({
      where: { vendor_id: id, status: 'pending' },
      take: 5,
    }),
  ]);
  return { vendor, recentOrders, pendingSettlements: settlements };
};

export const bulkDeleteVendors = (ids: string[]) =>
  prisma.vendor.updateMany({ where: { id: { in: ids } }, data: { status: 'rejected' } });

export const bulkUpdateVendorStatus = (ids: string[], status: string) =>
  prisma.vendor.updateMany({ where: { id: { in: ids } }, data: { status: status as never } });

// ─── Service Vendors ──────────────────────────────────────────────────────────

export const listServiceVendors = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { business_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.serviceVendor.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.serviceVendor.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const getServiceVendor = async (id: string) => {
  const v = await prisma.serviceVendor.findUnique({ where: { id }, include: { category: true, city: true, area: true } });
  if (!v) throw new AppError('Service vendor not found', 404);
  return v;
};

export const registerServiceVendor = async (data: {
  name: string; business_name: string; email: string; mobile: string; password: string;
  category_id?: string; city_id?: string; area_id?: string;
}) => {
  const exists = await prisma.serviceVendor.findFirst({ where: { OR: [{ email: data.email }, { mobile: data.mobile }] } });
  if (exists) throw new AppError('Email or mobile already registered', 409);

  return prisma.serviceVendor.create({
    data: { ...data, password_hash: await hashPassword(data.password) },
  });
};

export const updateServiceVendor = (id: string, data: object) =>
  prisma.serviceVendor.update({ where: { id }, data });

export const updateServiceVendorStatus = (id: string, status: string) =>
  prisma.serviceVendor.update({ where: { id }, data: { status: status as never } });

// Bank details
export const updateBankDetails = (vendorId: string, data: {
  bank_name: string; account_number: string; ifsc_code: string; upi_id?: string;
}) =>
  prisma.vendorBankAccount.upsert({
    where: { vendor_id: vendorId },
    update: data,
    create: { vendor_id: vendorId, ...data },
  });

export const getServiceVendorDashboard = async (id: string) => {
  const [vendor, recentOrders] = await Promise.all([
    prisma.serviceVendor.findUnique({ where: { id } }),
    prisma.order.findMany({
      where: { vendor_id: id },
      take: 10,
      orderBy: { created_at: 'desc' },
      include: { customer: { select: { name: true } }, orderItems: true },
    }),
  ]);
  return { vendor, recentOrders };
};
