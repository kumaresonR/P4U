import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';

let rzp: Razorpay | null = null;

export const getRazorpay = (): Razorpay => {
  if (!rzp) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  }
  return rzp;
};

export const createRazorpayOrder = async (amountINR: number, receiptId: string) => {
  const rzpInstance = getRazorpay();
  return rzpInstance.orders.create({
    amount: Math.round(amountINR * 100), // paise
    currency: 'INR',
    receipt: receiptId,
  });
};

export const verifyRazorpaySignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');
  return expected === razorpaySignature;
};
