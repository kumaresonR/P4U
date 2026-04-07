import { z } from 'zod';

export const createProductSchema = z.object({
  category_id: z.string().uuid().optional(),
  subcategory_id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  slug: z.string().optional(),
  short_description: z.string().max(500).optional(),
  long_description: z.string().optional(),
  price: z.number().positive(),
  compare_at_price: z.number().positive().optional(),
  tax: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
  discount_type: z.enum(['flat', 'percentage']).optional(),
  max_points_redeemable: z.number().int().min(0).default(0),
  sku: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  manage_stock: z.boolean().default(true),
  weight: z.number().positive().optional(),
  images: z.array(z.string().url()).default([]),
  thumbnail_image: z.string().url().optional(),
  banner_image: z.string().url().optional(),
  youtube_video_url: z.string().url().optional(),
  product_type: z.enum(['simple', 'variable', 'service']).default('simple'),
  promise_p4u: z.string().optional(),
  helpline_number: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'draft', 'pending_approval', 'rejected']).optional(),
});

export const createVariantSchema = z.object({
  sku: z.string().optional(),
  price: z.number().positive(),
  compare_at_price: z.number().positive().optional(),
  stock_quantity: z.number().int().min(0).default(0),
  variant_attributes: z.record(z.string()),
  image_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: z.enum(['active', 'inactive', 'draft', 'pending_approval', 'rejected']),
});
