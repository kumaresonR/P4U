import { z } from 'zod';

// Accepts a URL or an empty string (form sends "" when blank)
const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();
const optionalId = z.string().optional();

/** JSON often sends null for empty optional fields; coerce to undefined */
const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v));

/** DB uses "fixed" by default; UI may send that or null */
const discountTypeIn = z.preprocess(
  (val) => (val == null || val === '' ? undefined : val),
  z.enum(['flat', 'percentage', 'fixed']).optional(),
);

export const createProductSchema = z.object({
  vendor_id: optionalId,
  category_id: optionalId,
  subcategory_id: optionalId,
  title: z.string().min(3).max(200),
  slug: optionalString,
  short_description: z.string().max(500).optional(),
  long_description: z.string().optional(),
  price: z.number().positive(),
  compare_at_price: z.number().positive().optional(),
  tax: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
  discount_type: discountTypeIn,
  max_points_redeemable: z.number().int().min(0).default(0),
  sku: optionalString,
  stock: z.number().int().min(0).default(0),
  manage_stock: z.boolean().default(true),
  weight: z.number().positive().optional(),
  images: z.array(z.string()).default([]),
  thumbnail_image: optionalUrl,
  banner_image: optionalUrl,
  youtube_video_url: optionalUrl,
  product_type: z.enum(['simple', 'variable', 'service']).default('simple'),
  promise_p4u: z.string().optional(),
  helpline_number: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
}).passthrough();

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'draft', 'pending_approval', 'rejected']).optional(),
});

export const createVariantSchema = z.object({
  sku: optionalString,
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
