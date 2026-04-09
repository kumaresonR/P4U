import { prisma } from '../../config/database';
import { getPagination } from '../../utils/pagination';
import { Request } from 'express';

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export const getDashboardStats = async () => {
  const [
    total_customers, total_vendors, total_orders, orders_revenue,
    pending_settlements, active_products, total_classifieds,
    total_properties, recent_orders,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.vendor.count(),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ['completed', 'delivered'] } } }),
    prisma.settlement.count({ where: { status: 'pending' } }),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.classifiedAd.count(),
    prisma.property.count(),
    prisma.order.findMany({
      take: 10, orderBy: { created_at: 'desc' },
      include: {
        customer: { select: { name: true } },
        vendor: { select: { business_name: true } },
      },
    }),
  ]);

  return {
    total_customers,
    total_vendors,
    total_orders,
    total_revenue: orders_revenue._sum.total || 0,
    pending_settlements,
    active_products,
    total_classifieds,
    total_properties,
    recent_orders,
  };
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const getOrdersReport = async (req: Request) => {
  const { from, to, status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (from || to) {
    where.created_at = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  const orders = await prisma.order.findMany({
    where,
    include: { customer: { select: { name: true } }, vendor: { select: { business_name: true } }, orderItems: true },
    orderBy: { created_at: 'desc' },
  });
  return orders;
};

export const getRevenueReport = async (req: Request) => {
  const { from, to } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { status: 'completed' };
  if (from || to) {
    where.created_at = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  const result = await prisma.order.groupBy({
    by: ['vendor_id'],
    where,
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
  });
  return result;
};

export const getCustomersReport = async () => {
  const [total, active, suspended, recent] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: 'active' } }),
    prisma.customer.count({ where: { status: 'suspended' } }),
    prisma.customer.findMany({ take: 20, orderBy: { created_at: 'desc' }, select: { id: true, name: true, email: true, mobile: true, created_at: true, status: true } }),
  ]);
  return { total, active, suspended, recent };
};

export const getPointsReport = async () => {
  const [total, byType] = await Promise.all([
    prisma.pointsTransaction.aggregate({ _sum: { points: true } }),
    prisma.pointsTransaction.groupBy({ by: ['type'], _sum: { points: true }, _count: { id: true } }),
  ]);
  return { total_points: total._sum.points, by_type: byType };
};

export const getVendorPerformanceReport = async (req: Request) => {
  const { from, to } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { status: 'completed' };
  if (from || to) {
    where.created_at = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }
  const result = await prisma.order.groupBy({
    by: ['vendor_id'],
    where,
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
  });
  const vendorIds = result.map(r => r.vendor_id).filter(Boolean) as string[];
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, business_name: true, status: true },
  });
  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));
  return result.map(r => ({ ...r, vendor: vendorMap[r.vendor_id ?? ''] ?? null }));
};

export const getSettlementsReport = async (req: Request) => {
  const { from, to, status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.settlement_status = status;
  if (from || to) {
    where.created_at = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }
  const settlements = await prisma.settlement.findMany({
    where,
    include: { vendor: { select: { business_name: true } } },
    orderBy: { created_at: 'desc' },
  });
  return settlements;
};

export const getReferralsReport = async (req: Request) => {
  const { from, to } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.created_at = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }
  const [total, recent] = await Promise.all([
    prisma.customer.count({ where: { ...where, referral_code: { not: '' } } }),
    prisma.customer.findMany({
      where: { ...where, referred_by: { not: null } },
      select: { id: true, name: true, mobile: true, referred_by: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    }),
  ]);
  return { total_referrals: total, recent };
};

// ─── Banners ─────────────────────────────────────────────────────────────────

export const getBanners = () => prisma.banner.findMany({ orderBy: { priority: 'asc' } });
export const getActiveBanners = () => prisma.banner.findMany({ where: { status: 'active' }, orderBy: { priority: 'asc' } });
export const createBanner = (data: object) => prisma.banner.create({ data: data as Parameters<typeof prisma.banner.create>[0]['data'] });
export const updateBanner = (id: string, data: object) => prisma.banner.update({ where: { id }, data });
export const deleteBanner = (id: string) => prisma.banner.delete({ where: { id } });

// ─── Advertisements ───────────────────────────────────────────────────────────

export const getAdvertisements = () => prisma.advertisement.findMany({ orderBy: { created_at: 'desc' } });
export const getActiveAds = (placement?: string) =>
  prisma.advertisement.findMany({
    where: { status: 'active', ...(placement ? { placement } : {}) },
    orderBy: { created_at: 'desc' },
  });
export const createAd = (data: object) => prisma.advertisement.create({ data: data as Parameters<typeof prisma.advertisement.create>[0]['data'] });
export const updateAd = (id: string, data: object) => prisma.advertisement.update({ where: { id }, data });
export const deleteAd = (id: string) => prisma.advertisement.delete({ where: { id } });

// ─── Popup Banners ────────────────────────────────────────────────────────────

export const getPopupBanners = () => prisma.popupBanner.findMany();
export const getActivePopups = () => prisma.popupBanner.findMany({ where: { status: 'active' } });
export const createPopup = (data: object) => prisma.popupBanner.create({ data: data as Parameters<typeof prisma.popupBanner.create>[0]['data'] });
export const updatePopup = (id: string, data: object) => prisma.popupBanner.update({ where: { id }, data });
export const deletePopup = (id: string) => prisma.popupBanner.delete({ where: { id } });

// ─── CMS ─────────────────────────────────────────────────────────────────────

export const getCmsPages = () => prisma.cmsPage.findMany({ orderBy: { created_at: 'desc' } });
export const getCmsPage = (slug: string) => prisma.cmsPage.findUnique({ where: { slug } });
export const createCmsPage = (data: object) => prisma.cmsPage.create({ data: data as Parameters<typeof prisma.cmsPage.create>[0]['data'] });
export const updateCmsPage = (id: string, data: object) => prisma.cmsPage.update({ where: { id }, data });
export const deleteCmsPage = (id: string) => prisma.cmsPage.delete({ where: { id } });

// ─── Website Queries ──────────────────────────────────────────────────────────

export const getWebsiteQueries = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.websiteQuery.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.websiteQuery.count(),
  ]);
  return { data, total, page, limit };
};
export const createWebsiteQuery = (data: object) =>
  prisma.websiteQuery.create({ data: data as Parameters<typeof prisma.websiteQuery.create>[0]['data'] });
export const updateWebsiteQuery = (id: string, data: object) =>
  prisma.websiteQuery.update({ where: { id }, data });

// ─── Support Tickets ──────────────────────────────────────────────────────────

export const getSupportTickets = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.supportTicket.findMany({ skip, take: limit, include: { customer: { select: { name: true, email: true } } }, orderBy: { created_at: 'desc' } }),
    prisma.supportTicket.count(),
  ]);
  return { data, total, page, limit };
};
export const createSupportTicket = (customerId: string, data: object) =>
  prisma.supportTicket.create({ data: { ...(data as object), customer_id: customerId } as Parameters<typeof prisma.supportTicket.create>[0]['data'] });
export const replyToTicket = (id: string, reply: string) =>
  prisma.supportTicket.update({ where: { id }, data: { admin_reply: reply, status: 'resolved', replied_at: new Date() } });

// ─── Email Subscriptions ─────────────────────────────────────────────────────

export const subscribeEmail = (email: string, source?: string) =>
  prisma.emailSubscription.upsert({
    where: { email },
    update: { is_active: true },
    create: { email, source },
  });

export const unsubscribeEmail = (email: string) =>
  prisma.emailSubscription.update({ where: { email }, data: { is_active: false } });

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const getActivityLogs = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.activityLog.count(),
  ]);
  return { data, total, page, limit };
};

export const logActivity = (actorId: string, actorType: string, action: string, entityType?: string, entityId?: string, meta?: object) =>
  prisma.activityLog.create({
    data: { actor_id: actorId, actor_type: actorType, action, entity_type: entityType, entity_id: entityId, meta },
  });

// ─── KYC Management ──────────────────────────────────────────────────────────

export const listKycDocuments = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const [data, total] = await Promise.all([
    prisma.kycDocument.findMany({
      where, skip, take: limit,
      include: { customer: { select: { id: true, name: true, email: true, mobile: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.kycDocument.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const reviewKyc = async (id: string, status: string, rejectionReason?: string, adminNotes?: string) => {
  const doc = await prisma.kycDocument.update({
    where: { id },
    data: { status, rejection_reason: rejectionReason || '', admin_notes: adminNotes || '' },
    include: { customer: true },
  });
  if (status === 'approved') {
    await prisma.customer.update({ where: { id: doc.user_id }, data: { kyc_status: 'verified' } });
  } else if (status === 'rejected') {
    await prisma.customer.update({ where: { id: doc.user_id }, data: { kyc_status: 'rejected' } });
  }
  return doc;
};

// ─── Vendor Applications ─────────────────────────────────────────────────────

export const listVendorApplications = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const [data, total] = await Promise.all([
    prisma.vendorApplication.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.vendorApplication.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const reviewVendorApplication = (id: string, status: string, notes?: string) =>
  prisma.vendorApplication.update({ where: { id }, data: { status: status as never, notes } });

// ─── Inventory Management ─────────────────────────────────────────────────────

export const getInventoryLogs = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { product_id } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (product_id) where.product_id = product_id;
  const [data, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where, skip, take: limit,
      include: { product: { select: { title: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.inventoryLog.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const adjustInventory = async (productId: string, variantId: string | undefined, changeQty: number, reason: string, performedBy: string) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  const previousQty = product.stock;
  const newQty = Math.max(0, previousQty + changeQty);

  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { stock: newQty } }),
    prisma.inventoryLog.create({
      data: { product_id: productId, variant_id: variantId, change_qty: changeQty, previous_qty: previousQty, new_qty: newQty, reason, performed_by: performedBy },
    }),
  ]);
  return { previous_qty: previousQty, new_qty: newQty };
};

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const getAuditLogs = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.auditLog.count(),
  ]);
  return { data, total, page, limit };
};

// ─── Onboarding Screens ───────────────────────────────────────────────────────

export const getOnboardingScreens = () =>
  prisma.onboardingScreen.findMany({ where: { is_active: true }, orderBy: { display_order: 'asc' } });

export const getAllOnboardingScreens = () =>
  prisma.onboardingScreen.findMany({ orderBy: { display_order: 'asc' } });

export const createOnboardingScreen = (data: object) =>
  prisma.onboardingScreen.create({ data: data as Parameters<typeof prisma.onboardingScreen.create>[0]['data'] });

export const updateOnboardingScreen = (id: string, data: object) =>
  prisma.onboardingScreen.update({ where: { id }, data });

export const deleteOnboardingScreen = (id: string) =>
  prisma.onboardingScreen.delete({ where: { id } });

// ─── HomesCMS ────────────────────────────────────────────────────────────────

export const getHomesCms = (contentType?: string) =>
  prisma.homesCms.findMany({
    where: { is_active: true, ...(contentType ? { content_type: contentType } : {}) },
    orderBy: { sort_order: 'asc' },
  });

export const getAllHomesCms = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.homesCms.findMany({ skip, take: limit, orderBy: { sort_order: 'asc' } }),
    prisma.homesCms.count(),
  ]);
  return { data, total, page, limit };
};

export const createHomesCms = (data: object) =>
  prisma.homesCms.create({ data: data as Parameters<typeof prisma.homesCms.create>[0]['data'] });

export const updateHomesCms = (id: string, data: object) =>
  prisma.homesCms.update({ where: { id }, data });

export const deleteHomesCms = (id: string) =>
  prisma.homesCms.delete({ where: { id } });

// ─── Notifications (admin to user) ───────────────────────────────────────────

// ─── Points Transactions (admin list) ────────────────────────────────────────

export const listPointsTransactions = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { date_from, date_to, type } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (date_from || date_to) {
    where.created_at = {
      ...(date_from ? { gte: new Date(date_from) } : {}),
      ...(date_to   ? { lte: new Date(date_to)   } : {}),
    };
  }
  const [data, total] = await Promise.all([
    prisma.pointsTransaction.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: { customer: { select: { name: true, mobile: true } } } }),
    prisma.pointsTransaction.count({ where }),
  ]);
  return { data, total, page, limit };
};

// ─── Referrals (admin list) ───────────────────────────────────────────────────

export const listReferrals = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { date_from, date_to } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { referred_by: { not: null } };
  if (date_from || date_to) {
    where.created_at = {
      ...(date_from ? { gte: new Date(date_from) } : {}),
      ...(date_to   ? { lte: new Date(date_to)   } : {}),
    };
  }
  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, select: { id: true, name: true, mobile: true, email: true, referred_by: true, created_at: true } }),
    prisma.customer.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const adminSendToUser = async (customerId: string, title: string, body: string, data?: Record<string, string>) => {
  const { sendToUser } = await import('../notifications/notifications.service');
  return sendToUser(customerId, title, body, data);
};

export const adminBroadcast = async (title: string, body: string, role?: string) => {
  const { broadcast } = await import('../notifications/notifications.service');
  return broadcast(title, body, role);
};
