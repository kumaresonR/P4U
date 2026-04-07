import { prisma } from '../../config/database';
import crypto from 'crypto';

// ─── Cities ───────────────────────────────────────────────────────────────────

export const getCities = () =>
  prisma.city.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { areas: true } } } });

export const createCity = (data: { name: string; state: string }) =>
  prisma.city.create({ data: { id: crypto.randomUUID(), ...data } });

export const updateCity = (id: string, data: Partial<{ name: string; state: string; status: string }>) =>
  prisma.city.update({ where: { id }, data });

export const deleteCity = (id: string) => prisma.city.delete({ where: { id } });

// ─── Areas ────────────────────────────────────────────────────────────────────

export const getAreas = (cityId?: string) =>
  prisma.area.findMany({
    where: cityId ? { city_id: cityId } : undefined,
    orderBy: { name: 'asc' },
    include: { city: { select: { name: true } } },
  });

export const createArea = (data: { city_id: string; name: string; pincode?: string }) =>
  prisma.area.create({ data: { id: crypto.randomUUID(), ...data } });

export const updateArea = (id: string, data: Partial<{ name: string; pincode: string; status: string }>) =>
  prisma.area.update({ where: { id }, data });

export const deleteArea = (id: string) => prisma.area.delete({ where: { id } });

// ─── Occupations ─────────────────────────────────────────────────────────────

export const getOccupations = () =>
  prisma.occupation.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
  });

export const createOccupation = (name: string) =>
  prisma.occupation.create({ data: { id: crypto.randomUUID(), name } });

export const updateOccupation = (id: string, data: Partial<{ name: string; status: string }>) =>
  prisma.occupation.update({ where: { id }, data });

export const deleteOccupation = (id: string) => prisma.occupation.delete({ where: { id } });

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = (parentId?: string | null) =>
  prisma.category.findMany({
    where: parentId !== undefined ? { parent_id: parentId } : undefined,
    include: { children: true, _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });

export const createCategory = (data: {
  name: string; parent_id?: string; image?: string; banner_image?: string;
  icon?: string; description?: string; is_trending?: boolean;
}) => prisma.category.create({ data: { id: crypto.randomUUID(), ...data } });

export const updateCategory = (id: string, data: object) =>
  prisma.category.update({ where: { id }, data });

export const deleteCategory = (id: string) => prisma.category.delete({ where: { id } });

// ─── Service Categories ───────────────────────────────────────────────────────

export const getServiceCategories = () =>
  prisma.serviceCategory.findMany({
    include: { children: true, _count: { select: { services: true } } },
    orderBy: { name: 'asc' },
  });

export const createServiceCategory = (data: { name: string; icon?: string; image?: string; description?: string }) =>
  prisma.serviceCategory.create({ data: { id: crypto.randomUUID(), ...data } });

export const updateServiceCategory = (id: string, data: object) =>
  prisma.serviceCategory.update({ where: { id }, data });

export const deleteServiceCategory = (id: string) =>
  prisma.serviceCategory.delete({ where: { id } });

// ─── Tax Configs ─────────────────────────────────────────────────────────────

export const getTaxConfigs = () => prisma.taxConfig.findMany({ orderBy: { name: 'asc' } });

export const createTaxConfig = (data: { name: string; rate: number; type?: string; applied_to?: string }) =>
  prisma.taxConfig.create({ data: { ...data, type: data.type || 'GST' } });

export const updateTaxConfig = (id: string, data: object) =>
  prisma.taxConfig.update({ where: { id }, data });

export const deleteTaxConfig = (id: string) => prisma.taxConfig.delete({ where: { id } });

// ─── Platform Variables ───────────────────────────────────────────────────────

export const getPlatformVariables = () => prisma.platformVariable.findMany();

export const getPlatformVariable = (key: string) =>
  prisma.platformVariable.findUnique({ where: { key } });

export const setPlatformVariable = (key: string, value: string, description?: string) =>
  prisma.platformVariable.upsert({
    where: { key },
    update: { value },
    create: { id: crypto.randomUUID(), key, value, description: description || '' },
  });

export const deletePlatformVariable = (id: string) =>
  prisma.platformVariable.delete({ where: { id } });

// ─── Vendor Plans ─────────────────────────────────────────────────────────────

export const getVendorPlans = () => prisma.vendorPlan.findMany({ where: { status: 'active' } });

export const createVendorPlan = (data: object) =>
  prisma.vendorPlan.create({ data: { id: crypto.randomUUID(), ...(data as object) } as Parameters<typeof prisma.vendorPlan.create>[0]['data'] });

export const updateVendorPlan = (id: string, data: object) =>
  prisma.vendorPlan.update({ where: { id }, data });

export const deleteVendorPlan = (id: string) => prisma.vendorPlan.delete({ where: { id } });
