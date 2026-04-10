import { z } from 'zod';

// Order is created AFTER successful payment verification, so this endpoint
// just kicks off a Razorpay order. order_id is no longer required up-front.
export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR').optional(),
}).passthrough();

// On verify, we accept the full cart payload so the backend can create the
// real Order rows in a single atomic step after signature is verified.
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  cart: z.array(z.any()).optional(),
  address: z.any().optional(),
  totals: z.any().optional(),
}).passthrough();

export const codPlaceOrderSchema = z.object({
  cart: z.array(z.any()).min(1),
  address: z.any().optional(),
  totals: z.any().optional(),
}).passthrough();
