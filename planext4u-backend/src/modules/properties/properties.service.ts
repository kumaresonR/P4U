import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { Request } from 'express';

export const searchProperties = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { city_id, area_id, property_type, transaction_type, bedrooms, min_price, max_price, search } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { status: 'active' };
  if (city_id) where.city_id = city_id;
  if (area_id) where.area_id = area_id;
  if (property_type) where.property_type = property_type;
  if (transaction_type) where.transaction_type = transaction_type;
  if (bedrooms) where.bedrooms = parseInt(bedrooms);
  if (min_price || max_price) {
    where.price = {
      ...(min_price ? { gte: parseFloat(min_price) } : {}),
      ...(max_price ? { lte: parseFloat(max_price) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { locality: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where, skip, take: limit,
      include: { city: { select: { name: true } }, area: { select: { name: true } }, user: { select: { name: true, mobile: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.property.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const listPropertiesAdmin = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const [data, total] = await Promise.all([
    prisma.property.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.property.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const getProperty = async (id: string) => {
  const p = await prisma.property.findUnique({
    where: { id },
    include: {
      city: { select: { name: true } },
      area: { select: { name: true } },
      user: { select: { id: true, name: true, mobile: true, avatar: true } },
    },
  });
  if (!p) throw new AppError('Property not found', 404);
  await prisma.property.update({ where: { id }, data: { views_count: { increment: 1 } } });
  return p;
};

export const createProperty = (userId: string, data: object) =>
  prisma.property.create({ data: { ...(data as object), user_id: userId } as Parameters<typeof prisma.property.create>[0]['data'] });

export const updateProperty = (id: string, data: object) =>
  prisma.property.update({ where: { id }, data });

export const updatePropertyStatus = (id: string, status: string) =>
  prisma.property.update({ where: { id }, data: { status: status as never } });

export const deleteProperty = (id: string) =>
  prisma.property.update({ where: { id }, data: { status: 'inactive' } });

export const getUserProperties = async (userId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.property.findMany({ where: { user_id: userId }, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.property.count({ where: { user_id: userId } }),
  ]);
  return { data, total, page, limit };
};

// Property messages
export const getPropertyMessages = (propertyId: string) =>
  prisma.propertyMessage.findMany({
    where: { property_id: propertyId },
    include: { sender: { select: { name: true, avatar: true } } },
    orderBy: { created_at: 'asc' },
  });

export const sendPropertyMessage = (propertyId: string, senderId: string, message: string) =>
  prisma.propertyMessage.create({ data: { property_id: propertyId, sender_id: senderId, message } });

// Saved searches
export const getSavedSearches = (customerId: string) =>
  prisma.savedSearch.findMany({ where: { customer_id: customerId } });

export const createSavedSearch = (customerId: string, name: string, filters: object) =>
  prisma.savedSearch.create({ data: { customer_id: customerId, name, filters } });

export const deleteSavedSearch = (id: string) => prisma.savedSearch.delete({ where: { id } });

// Rent tracker (uses RentPayment model)
export const getRentTrackers = (customerId: string) =>
  prisma.rentPayment.findMany({
    where: { user_id: customerId },
    orderBy: { created_at: 'desc' },
  });

export const createRentTracker = (customerId: string, data: {
  property_name?: string; landlord_name?: string; landlord_contact?: string;
  monthly_rent: number; due_date: number;
}) =>
  prisma.rentPayment.create({
    data: {
      user_id: customerId,
      property_title: data.property_name || '',
      landlord_name: data.landlord_name,
      landlord_phone: data.landlord_contact,
      monthly_rent: data.monthly_rent,
      due_date: data.due_date,
    },
  });

export const addRentPayment = async (trackerId: string, data: {
  amount: number; paid_date: string; for_month: string; receipt_url?: string; notes?: string;
}) => {
  const tracker = await prisma.rentPayment.findUnique({ where: { id: trackerId } });
  if (!tracker) throw new AppError('Rent tracker not found', 404);

  const paidMonths = (tracker.paid_months as { month: string; amount: number; paid_date: string }[]) || [];
  paidMonths.push({ month: data.for_month, amount: data.amount, paid_date: data.paid_date });

  return prisma.rentPayment.update({
    where: { id: trackerId },
    data: { paid_months: paidMonths },
  });
};

// Property Bookmarks
export const toggleBookmark = async (propertyId: string, userId: string) => {
  const existing = await prisma.propertyBookmark.findUnique({
    where: { property_id_user_id: { property_id: propertyId, user_id: userId } },
  });
  if (existing) {
    await prisma.propertyBookmark.delete({ where: { property_id_user_id: { property_id: propertyId, user_id: userId } } });
    return { bookmarked: false };
  }
  await prisma.propertyBookmark.create({ data: { property_id: propertyId, user_id: userId } });
  return { bookmarked: true };
};

export const getBookmarks = (userId: string) =>
  prisma.propertyBookmark.findMany({
    where: { user_id: userId },
    include: { property: { select: { id: true, title: true, price: true, property_type: true, transaction_type: true, images: true, locality: true } } },
    orderBy: { created_at: 'desc' },
  });

// Property Enquiries
export const createEnquiry = (propertyId: string, userId: string, message?: string) =>
  prisma.propertyEnquiry.create({ data: { property_id: propertyId, user_id: userId, message } });

export const getEnquiries = (propertyId: string) =>
  prisma.propertyEnquiry.findMany({
    where: { property_id: propertyId },
    orderBy: { created_at: 'desc' },
  });

export const updateEnquiryStatus = (id: string, status: string) =>
  prisma.propertyEnquiry.update({ where: { id }, data: { status } });

// Property Visits
export const scheduleVisit = (propertyId: string, userId: string, scheduledAt: string, notes?: string) =>
  prisma.propertyVisit.create({ data: { property_id: propertyId, user_id: userId, scheduled_at: new Date(scheduledAt), notes } });

export const getVisits = (propertyId: string) =>
  prisma.propertyVisit.findMany({
    where: { property_id: propertyId },
    orderBy: { scheduled_at: 'asc' },
  });

export const updateVisitStatus = (id: string, status: string) =>
  prisma.propertyVisit.update({ where: { id }, data: { status } });

// Property Reports
export const reportProperty = (propertyId: string, userId: string, reason: string, description?: string) =>
  prisma.propertyReport.create({ data: { property_id: propertyId, user_id: userId, reason, description } });

export const getReports = async (req: import('express').Request) => {
  const { getPagination } = await import('../../utils/pagination');
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.propertyReport.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.propertyReport.count(),
  ]);
  return { data, total, page, limit };
};

// EMI Calculator (stateless)
export const calculateEmi = (principal: number, annualRate: number, tenureMonths: number) => {
  const r = annualRate / 12 / 100;
  const emi = r === 0 ? principal / tenureMonths : (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  const totalAmount = emi * tenureMonths;
  return { emi: Math.round(emi), total_amount: Math.round(totalAmount), total_interest: Math.round(totalAmount - principal) };
};
