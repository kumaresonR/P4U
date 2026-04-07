import { z } from 'zod';

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
