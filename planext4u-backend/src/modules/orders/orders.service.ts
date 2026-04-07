import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { env } from '../../config/env';
import { sendPushToTokens } from '../../services/firebase';
import { emitOrderUpdate, emitNotification } from '../../socket';
import { Request } from 'express';

// ─── Orders ───────────────────────────────────────────────────────────────────

export const listOrders = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status, vendor_id, customer_id } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendor_id) where.vendor_id = vendor_id;
  if (customer_id) where.customer_id = customer_id;

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where, skip, take: limit,
      include: {
        customer: { select: { name: true, mobile: true } },
        vendor: { select: { name: true, business_name: true } },
        orderItems: true,
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const getOrder = async (id: string) => {
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, mobile: true, email: true } },
      vendor: { select: { name: true, business_name: true } },
      orderItems: true,
      settlement: true,
    },
  });
  if (!o) throw new AppError('Order not found', 404);
  return o;
};

interface CartItemInput {
  product_id?: string;
  service_id?: string;
  variant_id?: string;
  qty: number;
  price: number;
  tax: number;
  discount: number;
  title: string;
  image?: string;
}

interface PlaceOrderInput {
  customer_id: string;
  items: CartItemInput[];
  points_used?: number;
  delivery_address?: object;
  notes?: string;
}

export const placeOrder = async (input: PlaceOrderInput) => {
  const customer = await prisma.customer.findUnique({ where: { id: input.customer_id } });
  if (!customer) throw new AppError('Customer not found', 404);

  const pointsUsed = input.points_used || 0;
  if (pointsUsed > customer.wallet_points) throw new AppError('Insufficient points', 400);

  const pointsDiscount = pointsUsed * 0.1; // 1 point = ₹0.10

  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  for (const item of input.items) {
    subtotal += item.price * item.qty;
    taxAmount += (item.price * item.qty * item.tax) / 100;
    discountAmount += (item.price * item.qty * item.discount) / 100;
  }

  const total = Math.max(0, subtotal + taxAmount - discountAmount - pointsDiscount);

  // Determine vendor_id from first product
  let vendorId: string | undefined;
  if (input.items[0]?.product_id) {
    const product = await prisma.product.findUnique({ where: { id: input.items[0].product_id } });
    vendorId = product?.vendor_id;
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customer_id: input.customer_id,
        vendor_id: vendorId,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        points_used: pointsUsed,
        points_discount: pointsDiscount,
        total,
        delivery_address: input.delivery_address,
        notes: input.notes,
        orderItems: {
          create: input.items.map((item) => ({
            product_id: item.product_id,
            service_id: item.service_id,
            variant_id: item.variant_id,
            title: item.title,
            image: item.image,
            price: item.price,
            qty: item.qty,
            tax: item.tax,
            discount: item.discount,
            subtotal: item.price * item.qty,
          })),
        },
      },
      include: { orderItems: true },
    });

    if (pointsUsed > 0) {
      await tx.customer.update({
        where: { id: input.customer_id },
        data: { wallet_points: { decrement: pointsUsed } },
      });
      await tx.pointsTransaction.create({
        data: {
          user_id: input.customer_id,
          order_id: created.id,
          type: 'redeemed',
          points: -pointsUsed,
          description: `Points redeemed on order #${created.id.slice(0, 8)}`,
        },
      });
    }

    // Clear cart after placing order
    await tx.cartItem.deleteMany({ where: { customer_id: input.customer_id } });

    return created;
  });

  return order;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, vendor: true },
  });
  if (!order) throw new AppError('Order not found', 404);

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status } });

  if (status === 'completed') {
    const commissionRate = order.vendor_id
      ? (await prisma.vendor.findUnique({ where: { id: order.vendor_id } }))?.commission_rate ?? 10
      : 10;

    const commission = Number(order.total) * (commissionRate / 100);
    const netAmount = Number(order.total) - commission;
    const rewardPoints = Math.floor(Number(order.total) * (env.ORDER_REWARD_PERCENTAGE / 100));

    await prisma.$transaction([
      ...(order.vendor_id ? [
        prisma.settlement.create({
          data: {
            vendor_id: order.vendor_id,
            order_id: orderId,
            amount: order.total,
            commission,
            net_amount: netAmount,
          },
        }),
        prisma.vendor.update({
          where: { id: order.vendor_id },
          data: { total_orders: { increment: 1 }, total_revenue: { increment: Number(order.total) } },
        }),
      ] : []),
      prisma.customer.update({
        where: { id: order.customer_id },
        data: { wallet_points: { increment: rewardPoints } },
      }),
      prisma.pointsTransaction.create({
        data: {
          user_id: order.customer_id,
          order_id: orderId,
          type: 'order_reward',
          points: rewardPoints,
          description: `Reward for order #${orderId.slice(0, 8)}`,
        },
      }),
    ]);

    // Push notification via FCM tokens
    if (order.customer.fcm_tokens?.length) {
      await sendPushToTokens(order.customer.fcm_tokens as string[], {
        title: 'Order Completed!',
        body: `Your order has been delivered. You earned ${rewardPoints} points!`,
        data: { order_id: orderId, type: 'order_completed' },
      });
    }
  }

  // Real-time socket update
  emitOrderUpdate(orderId, { status });
  emitNotification(order.customer_id, {
    title: `Order ${status}`,
    body: `Your order #${orderId.slice(0, 8)} is now ${status}`,
    data: { order_id: orderId, status },
  });

  return updated;
};

export const getCustomerOrders = async (customerId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where: { customer_id: customerId },
      skip, take: limit,
      include: { vendor: { select: { name: true, business_name: true } }, orderItems: true },
      orderBy: { created_at: 'desc' },
    }),
    prisma.order.count({ where: { customer_id: customerId } }),
  ]);
  return { data, total, page, limit };
};

// ─── Settlements ──────────────────────────────────────────────────────────────

export const listSettlements = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status, vendor_id } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendor_id) where.vendor_id = vendor_id;

  const [data, total] = await Promise.all([
    prisma.settlement.findMany({
      where, skip, take: limit,
      include: { order: { include: { vendor: { select: { name: true, business_name: true } } } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.settlement.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const settleSettlement = (id: string) =>
  prisma.settlement.update({ where: { id }, data: { status: 'settled', settled_at: new Date() } });

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const getCart = (customerId: string) =>
  prisma.cartItem.findMany({
    where: { customer_id: customerId },
    include: { product: { select: { id: true, title: true, price: true, image: true, stock: true, is_available: true } } },
  });

export const addToCart = async (customerId: string, data: {
  product_id?: string;
  service_id?: string;
  variant_id?: string;
  qty?: number;
}) => {
  // If same product exists, increment qty
  if (data.product_id) {
    const existing = await prisma.cartItem.findFirst({
      where: { customer_id: customerId, product_id: data.product_id, variant_id: data.variant_id || null },
    });
    if (existing) {
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: { increment: data.qty || 1 } },
      });
    }
  }
  return prisma.cartItem.create({
    data: { customer_id: customerId, ...data, qty: data.qty || 1 },
  });
};

export const updateCartItem = (id: string, qty: number) =>
  prisma.cartItem.update({ where: { id }, data: { qty } });

export const removeCartItem = (id: string) => prisma.cartItem.delete({ where: { id } });

export const clearCart = (customerId: string) =>
  prisma.cartItem.deleteMany({ where: { customer_id: customerId } });

export const cancelOrder = async (orderId: string, customerId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Order not found', 404);
  if (order.customer_id !== customerId) throw new AppError('Not your order', 403);
  if (!['placed', 'confirmed'].includes(order.status)) throw new AppError('Order cannot be cancelled', 400);

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });

  // Refund points if any were redeemed
  if (order.points_used > 0) {
    await prisma.$transaction([
      prisma.customer.update({ where: { id: customerId }, data: { wallet_points: { increment: order.points_used } } }),
      prisma.pointsTransaction.create({
        data: {
          user_id: customerId,
          order_id: orderId,
          type: 'refund',
          points: order.points_used,
          description: `Points refunded for cancelled order #${orderId.slice(0, 8)}`,
        },
      }),
    ]);
  }
  return updated;
};

export const rateOrder = async (orderId: string, customerId: string, deliveryRating: number, ratingComment?: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Order not found', 404);
  if (order.customer_id !== customerId) throw new AppError('Not your order', 403);
  if (!['delivered', 'completed'].includes(order.status)) throw new AppError('Order not yet delivered', 400);

  return prisma.order.update({
    where: { id: orderId },
    data: { delivery_rating: deliveryRating, rating_comment: ratingComment, rated_at: new Date() },
  });
};

export const getVendorSettlements = async (vendorId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.settlement.findMany({
      where: { vendor_id: vendorId },
      skip, take: limit,
      include: { order: { select: { id: true, total: true, status: true, created_at: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.settlement.count({ where: { vendor_id: vendorId } }),
  ]);
  return { data, total, page, limit };
};
