import { prisma } from '../../config/database';
import { sendPushToTokens, sendPushToTopic } from '../../services/firebase';
import { getPagination } from '../../utils/pagination';
import { Request } from 'express';

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
  const topic = role === 'customer' ? 'customers' : role === 'vendor' ? 'vendors' : 'all';
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
