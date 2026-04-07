import { z } from 'zod';

export const citySchema = z.object({
  name: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
});

export const areaSchema = z.object({
  name: z.string().min(2).max(100),
  city_id: z.string(),
  pincode: z.string().max(10).optional(),
});

export const occupationSchema = z.object({
  name: z.string().min(2).max(100),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  parent_id: z.string().nullable().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  banner_image: z.string().optional(),
  description: z.string().optional(),
  is_trending: z.boolean().optional(),
  commission_rate: z.number().optional(),
  is_emergency: z.boolean().optional(),
});

export const serviceCategorySchema = z.object({
  name: z.string().min(2).max(100),
  icon: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  parent_id: z.string().nullable().optional(),
});

export const taxConfigSchema = z.object({
  name: z.string().min(2).max(100),
  rate: z.number().min(0).max(100),
  type: z.string().default('GST'),
  applied_to: z.string().optional(),
});

export const vendorPlanSchema = z.object({
  name: z.string().min(2).max(100),
  price: z.number().min(0),
  duration_days: z.number().int().positive(),
  max_products: z.number().int().min(0).optional(),
  max_services: z.number().int().min(0).optional(),
  commission_rate: z.number().min(0).max(100).default(10),
  features: z.any().optional(),
});

export const platformVariableSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().optional(),
});
