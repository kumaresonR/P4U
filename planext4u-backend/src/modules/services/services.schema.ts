import { z } from 'zod';

export const createServiceSchema = z.object({
  category_id: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().optional().default(''),
  price: z.number().positive(),
  tax: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
  max_points_redeemable: z.number().int().min(0).default(0),
  images: z.array(z.string()).default([]),
  image: z.string().optional(),
  duration: z.string().optional(),
  service_area: z.string().optional(),
  emoji: z.string().optional(),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'draft', 'pending_approval', 'rejected']).optional(),
});

export const bulkServiceSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const bulkServiceStatusSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: z.enum(['active', 'inactive', 'draft', 'pending_approval', 'rejected']),
});
