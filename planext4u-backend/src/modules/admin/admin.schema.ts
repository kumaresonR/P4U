import { z } from 'zod';

const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();
const requiredUrlOrEmpty = z.union([z.string().url(), z.literal('')]);

export const bannerSchema = z.object({
  title: z.string().min(2).max(200),
  image: requiredUrlOrEmpty,
  link: z.string().optional(),
  placement: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
}).passthrough();

export const adSchema = z.object({
  title: z.string().min(2).max(200),
  image: requiredUrlOrEmpty,
  link: z.string().optional(),
  placement: z.string().min(1),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
}).passthrough();

export const popupSchema = z.object({
  title: z.string().min(2).max(200),
  image: requiredUrlOrEmpty,
  link: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
}).passthrough();

export const cmsPageSchema = z.object({
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(200),
  content: z.string(),
  meta_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
});

export const websiteQuerySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(5),
});

export const updateQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  admin_notes: z.string().optional(),
});

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const replyTicketSchema = z.object({
  reply: z.string().min(1),
});

export const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  role: z.enum(['customer', 'vendor', 'service_vendor', 'all']).optional(),
});

export const sendToUserSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  data: z.record(z.string()).optional(),
});

export const emailSubscribeSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export const kycReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional(),
  admin_notes: z.string().optional(),
});

export const vendorApplicationReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

export const inventoryAdjustSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  change_qty: z.number().int(),
  reason: z.string().min(2).max(200),
});

export const onboardingScreenSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  image_url: requiredUrlOrEmpty,
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
}).passthrough();

export const homesCmsSchema = z.object({
  content_type: z.string().min(2).max(100),
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
});
