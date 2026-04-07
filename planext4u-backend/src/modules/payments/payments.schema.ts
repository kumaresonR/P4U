import { z } from 'zod';

export const createPaymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  order_id: z.string().uuid(),
});
