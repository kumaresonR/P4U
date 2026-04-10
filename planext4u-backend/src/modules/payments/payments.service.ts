import { prisma } from '../../config/database';
import { createRazorpayOrder, verifyRazorpaySignature } from '../../services/razorpay';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';

/**
 * Step 1 of checkout: create a Razorpay order. The DB Order + Payment rows
 * are only created after signature verification succeeds in confirmPayment.
 */
export async function initiatePayment(customerId: string, amount: number) {
  const receipt = `rcpt_${customerId.slice(0, 8)}_${Date.now()}`;
  const rzpOrder = await createRazorpayOrder(amount, receipt);

  return {
    razorpay_order_id: rzpOrder.id,
    order_id: rzpOrder.id, // alias for frontend convenience
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    key_id: env.RAZORPAY_KEY_ID,
  };
}

/**
 * Step 2 of checkout: verify Razorpay signature, then create the real DB Order(s).
 * Cart items are grouped by vendor — one Order row per vendor.
 */
export async function confirmPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  customerId: string,
  cart: any[],
  totals: any = {},
  address: any = null,
) {
  const valid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new AppError('Invalid payment signature', 400);

  if (!Array.isArray(cart) || cart.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // Group items by vendor
  const groups: Record<string, any[]> = {};
  for (const item of cart) {
    const vid = item.vendor_id;
    if (!vid) continue;
    if (!groups[vid]) groups[vid] = [];
    groups[vid].push(item);
  }

  if (Object.keys(groups).length === 0) {
    throw new AppError('Cart items missing vendor_id', 400);
  }

  const createdOrders: any[] = [];

  for (const [vendorId, items] of Object.entries(groups)) {
    // Validate vendor exists; skip if not
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) continue;

    const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const taxAmount = items.reduce((s, i) => s + (Number(i.tax) || 0) * (Number(i.qty) || 1), 0);
    const discountAmount = Number(totals?.discount || 0);
    const pointsUsed = Number(totals?.points_used || 0);
    const platformFee = Number(totals?.platform_fee || 0);
    const gstOnPlatformFee = Number(totals?.gst_on_platform_fee || 0);
    const total = subtotal + taxAmount + platformFee + gstOnPlatformFee - discountAmount - pointsUsed;

    const order = await prisma.order.create({
      data: {
        customer_id: customerId,
        vendor_id: vendorId,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        points_used: pointsUsed,
        platform_fee: platformFee,
        gst_on_platform_fee: gstOnPlatformFee,
        total,
        status: 'paid',
        payment_status: 'paid',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        delivery_address: address ?? undefined,
        items_json: items as any,
        orderItems: {
          create: items.map((i: any) => ({
            product_id: i.id,
            title: i.title,
            qty: Number(i.qty) || 1,
            price: Number(i.price) || 0,
            image: i.image || '',
            tax: Number(i.tax) || 0,
            discount: Number(i.discount) || 0,
            subtotal: (Number(i.price) || 0) * (Number(i.qty) || 1),
          })),
        },
      } as any,
    });
    createdOrders.push(order);

    // Create corresponding payment row
    await prisma.payment.create({
      data: {
        order_id: order.id,
        customer_id: customerId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        amount: total,
        status: 'paid',
      } as any,
    }).catch(() => { /* unique constraint on razorpay_order_id when multiple orders — ignore */ });
  }

  return {
    verified: true,
    orders: createdOrders.map((o) => ({ id: o.id, vendor_id: o.vendor_id, total: o.total })),
  };
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

/** Cash on delivery — creates orders without Razorpay (for local / QA testing). */
export async function placeCodOrder(
  customerId: string,
  cart: any[],
  totals: any = {},
  address: any = null,
) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  const groups: Record<string, any[]> = {};
  for (const item of cart) {
    const vid = item.vendor_id;
    if (!vid) continue;
    if (!groups[vid]) groups[vid] = [];
    groups[vid].push(item);
  }

  if (Object.keys(groups).length === 0) {
    throw new AppError('Cart items missing vendor_id', 400);
  }

  const codBatchRef = `COD-${Date.now()}`;
  const createdOrders: any[] = [];

  for (const [vendorId, items] of Object.entries(groups)) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) continue;

    const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const taxAmount = items.reduce((s, i) => s + (Number(i.tax) || 0) * (Number(i.qty) || 1), 0);
    const discountAmount = Number(totals?.discount || 0);
    const pointsUsed = Number(totals?.points_used || 0);
    const platformFee = Number(totals?.platform_fee || 0);
    const gstOnPlatformFee = Number(totals?.gst_on_platform_fee || 0);
    const total = subtotal + taxAmount + platformFee + gstOnPlatformFee - discountAmount - pointsUsed;

    const order = await prisma.order.create({
      data: {
        customer_id: customerId,
        vendor_id: vendorId,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        points_used: pointsUsed,
        platform_fee: platformFee,
        gst_on_platform_fee: gstOnPlatformFee,
        total,
        status: 'placed',
        payment_status: 'cod',
        payment_reference_id: `${codBatchRef}-${vendorId.slice(0, 8)}`,
        delivery_address: address ?? undefined,
        items_json: items as any,
        orderItems: {
          create: items.map((i: any) => ({
            product_id: i.id,
            title: i.title,
            qty: Number(i.qty) || 1,
            price: Number(i.price) || 0,
            image: i.image || '',
            tax: Number(i.tax) || 0,
            discount: Number(i.discount) || 0,
            subtotal: (Number(i.price) || 0) * (Number(i.qty) || 1),
          })),
        },
      } as any,
    });
    createdOrders.push(order);

    await prisma.payment.create({
      data: {
        order_id: order.id,
        customer_id: customerId,
        amount: total,
        status: 'pending',
        method: 'cod',
        currency: 'INR',
      } as any,
    });
  }

  if (createdOrders.length === 0) {
    throw new AppError('Could not create order — no valid vendors for cart items', 400);
  }

  return {
    success: true,
    orders: createdOrders.map((o) => ({ id: o.id, vendor_id: o.vendor_id, total: o.total })),
  };
}
