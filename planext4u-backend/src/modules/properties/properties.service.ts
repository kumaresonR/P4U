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
  const { status, search, user_id } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (user_id) where.user_id = user_id;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { locality: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        city: { select: { name: true } },
      },
    }),
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
  prisma.property.create({
    data: { ...(data as object), user_id: userId } as Parameters<typeof prisma.property.create>[0]['data'],
  });

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
  start_date?: string;
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

export const listPropertyReportsFull = () =>
  prisma.propertyReport.findMany({
    orderBy: { created_at: 'desc' },
    include: { property: { select: { id: true, title: true, locality: true } } },
  });

export const updatePropertyReportRow = (id: string, status: string) =>
  prisma.propertyReport.update({ where: { id }, data: { status } });

// EMI Calculator (stateless)
export const calculateEmi = (principal: number, annualRate: number, tenureMonths: number) => {
  const r = annualRate / 12 / 100;
  const emi = r === 0 ? principal / tenureMonths : (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  const totalAmount = emi * tenureMonths;
  return { emi: Math.round(emi), total_amount: Math.round(totalAmount), total_interest: Math.round(totalAmount - principal) };
};

// Two-party property chat (customer ↔ owner), no receiver_id on messages
export const getPropertyMessagesBetween = async (propertyId: string, userId: string, otherUserId: string) => {
  const prop = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!prop) throw new AppError('Property not found', 404);
  if (userId === otherUserId) throw new AppError('Forbidden', 403);
  const involvesOwner = userId === prop.user_id || otherUserId === prop.user_id;
  if (!involvesOwner) throw new AppError('Forbidden', 403);
  return prisma.propertyMessage.findMany({
    where: { property_id: propertyId, sender_id: { in: [userId, otherUserId] } },
    include: { sender: { select: { name: true, avatar: true } } },
    orderBy: { created_at: 'asc' },
  });
};

export const markPropertyThreadRead = async (propertyId: string, readerId: string, senderIdToMark: string) => {
  await prisma.propertyMessage.updateMany({
    where: { property_id: propertyId, sender_id: senderIdToMark, is_read: false },
    data: { is_read: true },
  });
};

export type PropertyChatThread = {
  id: string;
  property_id: string;
  other_user_id: string;
  other_name: string;
  last_message: { id: string; message: string; created_at: Date; sender_id: string };
  unread: number;
};

export const getMyPropertyChatThreads = async (userId: string): Promise<PropertyChatThread[]> => {
  type Msg = {
    id: string; message: string; created_at: Date; sender_id: string; property_id: string;
    property: { user_id: string; user: { name: string | null } | null };
    sender: { id: string; name: string | null } | null;
  };
  const threads = new Map<string, PropertyChatThread>();

  const sent = (await prisma.propertyMessage.findMany({
    where: { sender_id: userId },
    include: { property: { include: { user: { select: { id: true, name: true } } } } },
    orderBy: { created_at: 'desc' },
  })) as Msg[];
  for (const m of sent) {
    const ownerId = m.property.user_id;
    const key = `${ownerId}_${m.property_id}`;
    if (threads.has(key)) continue;
    const unread = await prisma.propertyMessage.count({
      where: { property_id: m.property_id, sender_id: ownerId, is_read: false },
    });
    threads.set(key, {
      id: key,
      property_id: m.property_id,
      other_user_id: ownerId,
      other_name: m.property.user?.name || 'Owner',
      last_message: { id: m.id, message: m.message, created_at: m.created_at, sender_id: m.sender_id },
      unread,
    });
  }

  const owned = await prisma.property.findMany({ where: { user_id: userId }, select: { id: true } });
  const ownedIds = owned.map((p) => p.id);
  if (ownedIds.length) {
    const received = (await prisma.propertyMessage.findMany({
      where: { property_id: { in: ownedIds }, sender_id: { not: userId } },
      include: { sender: { select: { id: true, name: true } }, property: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { created_at: 'desc' },
    })) as Msg[];
    for (const m of received) {
      const key = `${m.sender_id}_${m.property_id}`;
      if (threads.has(key)) continue;
      const unread = await prisma.propertyMessage.count({
        where: { property_id: m.property_id, sender_id: m.sender_id, is_read: false },
      });
      threads.set(key, {
        id: key,
        property_id: m.property_id,
        other_user_id: m.sender_id,
        other_name: m.sender?.name || 'User',
        last_message: { id: m.id, message: m.message, created_at: m.created_at, sender_id: m.sender_id },
        unread,
      });
    }
  }

  const refreshLast = async (t: PropertyChatThread): Promise<PropertyChatThread> => {
    const last = await prisma.propertyMessage.findFirst({
      where: {
        property_id: t.property_id,
        sender_id: { in: [userId, t.other_user_id] },
      },
      orderBy: { created_at: 'desc' },
    });
    if (!last) return t;
    return {
      ...t,
      last_message: {
        id: last.id,
        message: last.message,
        created_at: last.created_at,
        sender_id: last.sender_id,
      },
    };
  };

  const merged = await Promise.all([...threads.values()].map(refreshLast));
  return merged.sort(
    (a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime(),
  );
};

export const updateRentTrackerPaidMonths = async (trackerId: string, userId: string, paid_months: unknown[]) => {
  const t = await prisma.rentPayment.findUnique({ where: { id: trackerId } });
  if (!t || t.user_id !== userId) throw new AppError('Rent tracker not found', 404);
  return prisma.rentPayment.update({
    where: { id: trackerId },
    data: { paid_months: paid_months as object },
  });
};

export const deleteRentTracker = async (trackerId: string, userId: string) => {
  const t = await prisma.rentPayment.findUnique({ where: { id: trackerId } });
  if (!t || t.user_id !== userId) throw new AppError('Rent tracker not found', 404);
  await prisma.rentPayment.delete({ where: { id: trackerId } });
};

// ─── Admin: property master data ─────────────────────────────────────────────

export const listAllPropertyLocalities = () =>
  prisma.propertyLocality.findMany({ orderBy: { created_at: 'desc' } });

export const createPropertyLocalityRow = (data: { name: string; city_id?: string | null; area_id?: string | null; status?: string }) =>
  prisma.propertyLocality.create({ data });

export const updatePropertyLocalityRow = (id: string, data: object) =>
  prisma.propertyLocality.update({ where: { id }, data });

export const deletePropertyLocalityRow = (id: string) =>
  prisma.propertyLocality.delete({ where: { id } });

export const listAllPropertyAmenities = () =>
  prisma.propertyAmenity.findMany({ orderBy: { sort_order: 'asc' } });

export const createPropertyAmenityRow = (data: object) =>
  prisma.propertyAmenity.create({ data: data as Parameters<typeof prisma.propertyAmenity.create>[0]['data'] });

export const updatePropertyAmenityRow = (id: string, data: object) =>
  prisma.propertyAmenity.update({ where: { id }, data });

export const deletePropertyAmenityRow = (id: string) =>
  prisma.propertyAmenity.delete({ where: { id } });

export const listAllPropertyFilterOptions = () =>
  prisma.propertyFilterOption.findMany({ orderBy: { sort_order: 'asc' } });

export const createPropertyFilterOptionRow = (data: object) =>
  prisma.propertyFilterOption.create({ data: data as Parameters<typeof prisma.propertyFilterOption.create>[0]['data'] });

export const updatePropertyFilterOptionRow = (id: string, data: object) =>
  prisma.propertyFilterOption.update({ where: { id }, data });

export const deletePropertyFilterOptionRow = (id: string) =>
  prisma.propertyFilterOption.delete({ where: { id } });

export const listAllPropertyPlans = () =>
  prisma.propertyPlan.findMany({ orderBy: { price: 'asc' } });

export const createPropertyPlanRow = (data: object) =>
  prisma.propertyPlan.create({ data: data as Parameters<typeof prisma.propertyPlan.create>[0]['data'] });

export const updatePropertyPlanRow = (id: string, data: object) =>
  prisma.propertyPlan.update({ where: { id }, data });

export const deletePropertyPlanRow = (id: string) =>
  prisma.propertyPlan.delete({ where: { id } });
