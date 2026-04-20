import { prisma } from '../../config/database';
import { sendPushToTokens, sendPushToTopic } from '../../services/firebase';
import { getPagination } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler';
import { Request } from 'express';

const ALLOWED_BROADCAST_ROLES = ['customer', 'vendor', 'all'] as const;

export const sendToUser = async (customerId: string, title: string, body: string, data?: Record<string, string>) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { fcm_tokens: true },
  });
  if (!customer) return;

  await prisma.notification.create({
    data: { customer_id: customerId, title, body, data, channel: 'in_app' },
  });

  if ((customer.fcm_tokens as string[]).length) {
    await sendPushToTokens(customer.fcm_tokens as string[], { title, body, data });
  }
};

export const broadcast = async (title: string, body: string, role?: string) => {
  if (!title?.trim() || !body?.trim()) throw new AppError('title and body are required', 400);
  const resolvedRole = role || 'all';
  if (!ALLOWED_BROADCAST_ROLES.includes(resolvedRole as typeof ALLOWED_BROADCAST_ROLES[number])) {
    throw new AppError(`role must be one of: ${ALLOWED_BROADCAST_ROLES.join(', ')}`, 400);
  }
  const topic = resolvedRole === 'customer' ? 'customers' : resolvedRole === 'vendor' ? 'vendors' : 'all';
  await sendPushToTopic(topic, { title, body });
};

export const getMyNotifications = async (customerId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where: { customer_id: customerId },
      skip, take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.notification.count({ where: { customer_id: customerId } }),
  ]);
  return { data, total, page, limit };
};

export const markRead = (id: string) =>
  prisma.notification.update({ where: { id }, data: { is_read: true } });

export const markAllRead = (customerId: string) =>
  prisma.notification.updateMany({ where: { customer_id: customerId }, data: { is_read: true } });

export const getUnreadCount = (customerId: string) =>
  prisma.notification.count({ where: { customer_id: customerId, is_read: false } });
