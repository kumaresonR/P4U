import { prisma } from '../../config/database';
import { createRazorpayOrder, verifyRazorpaySignature } from '../../services/razorpay';
import { AppError } from '../../middleware/errorHandler';

export async function initiatePayment(orderId: string, customerId: string, amount: number) {
  const rzpOrder = await createRazorpayOrder(amount, orderId);

  await prisma.payment.create({
    data: {
      order_id: orderId,
      customer_id: customerId,
      razorpay_order_id: rzpOrder.id,
      amount,
    },
  });

  return {
    razorpay_order_id: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
  };
}

export async function confirmPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  orderId: string,
) {
  const valid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new AppError('Invalid payment signature', 400);

  await prisma.payment.updateMany({
    where: { razorpay_order_id: razorpayOrderId },
    data: { razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature, status: 'paid' },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      payment_status: 'paid',
      status: 'confirmed',
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
    },
  });
}

export async function handleWebhookEvent(event: any) {
  if (event.event === 'payment.captured') {
    const paymentId = event.payload.payment.entity.id;
    await prisma.payment.updateMany({
      where: { razorpay_payment_id: paymentId },
      data: { status: 'paid' },
    });
  }
}

export async function getPaymentByOrder(orderId: string) {
  return prisma.payment.findFirst({ where: { order_id: orderId } });
}
