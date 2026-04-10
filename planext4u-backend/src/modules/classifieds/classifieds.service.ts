import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { nullifyEmptyStrings } from '../../utils/sanitize';
import { Request } from 'express';

export const listClassifieds = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, status, category, city } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];

  const [data, total] = await Promise.all([
    prisma.classifiedAd.findMany({
      where, skip, take: limit,
      include: { user: { select: { name: true, mobile: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.classifiedAd.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const browseClassifieds = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { search, category, city } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { status: 'approved' };
  if (category) where.category = category;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.classifiedAd.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.classifiedAd.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const getClassified = async (id: string) => {
  const c = await prisma.classifiedAd.findUnique({
    where: { id },
    include: { user: { select: { name: true, mobile: true } } },
  });
  if (!c) throw new AppError('Classified not found', 404);
  return c;
};

export const createClassified = async (userId: string, data: any) => {
  const clean = nullifyEmptyStrings(data, ['city', 'area', 'category']);
  return prisma.classifiedAd.create({ data: { ...clean, user_id: userId } });
};

export const updateClassified = (id: string, data: object) =>
  prisma.classifiedAd.update({ where: { id }, data });

export const updateClassifiedStatus = (id: string, status: string) =>
  prisma.classifiedAd.update({ where: { id }, data: { status: status as never } });

export const deleteClassified = (id: string) =>
  prisma.classifiedAd.delete({ where: { id } });

export const getUserClassifieds = async (userId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.classifiedAd.findMany({ where: { user_id: userId }, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.classifiedAd.count({ where: { user_id: userId } }),
  ]);
  return { data, total, page, limit };
};
