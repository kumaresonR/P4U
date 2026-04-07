import { z } from 'zod';

export const placeOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid().optional(),
    service_id: z.string().uuid().optional(),
    variant_id: z.string().uuid().optional(),
    qty: z.number().int().min(1),
    price: z.number().positive(),
    tax: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
    title: z.string(),
    image: z.string().url().optional(),
  })).min(1),
  points_used: z.number().int().min(0).default(0),
  delivery_address: z.object({
    label: z.string().optional(),
    address: z.string(),
    city: z.string(),
    area: z.string(),
    pincode: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['placed', 'confirmed', 'accepted', 'in_progress', 'out_for_delivery', 'delivered', 'completed', 'cancelled']),
});

export const addCartSchema = z.object({
  product_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
  variant_id: z.string().uuid().optional(),
  qty: z.number().int().min(1).default(1),
});

export const updateCartSchema = z.object({
  qty: z.number().int().min(1),
});

export const rateOrderSchema = z.object({
  delivery_rating: z.number().int().min(1).max(5),
  rating_comment: z.string().max(500).optional(),
});
