import { z } from 'zod';

export const createClassifiedSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  price: z.number().min(0),
  category: z.string().min(2),
  city: z.string().min(2),
  area: z.string().min(2),
  images: z.array(z.string().url()).default([]),
  contact: z.string().optional(),
});

export const updateClassifiedSchema = createClassifiedSchema.partial();

export const updateClassifiedStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'expired', 'sold']),
});
