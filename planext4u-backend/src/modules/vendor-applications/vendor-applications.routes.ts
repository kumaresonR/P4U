import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/response';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types';
import type { VendorApplication, Prisma } from '@prisma/client';

const TOP_LEVEL = new Set([
  'name', 'business_name', 'email', 'phone', 'mobile', 'user_id',
  'category_id', 'city_id', 'area_id', 'status',
]);

const createBodySchema = z.object({
  name: z.string().min(1),
  business_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  mobile: z.string().min(8).optional(),
  status: z.string().optional(),
}).passthrough();

const patchBodySchema = createBodySchema.partial();

function documentsFromBody(body: Record<string, unknown>, customerId?: string) {
  const doc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!TOP_LEVEL.has(k)) doc[k] = v;
  }
  if (customerId) doc.customer_id = customerId;
  return doc;
}

function toDto(row: VendorApplication) {
  const doc = (row.documents && typeof row.documents === 'object' && !Array.isArray(row.documents))
    ? (row.documents as Record<string, unknown>)
    : {};
  const { customer_id: _c, ...extra } = doc;
  return {
    id: row.id,
    name: row.name,
    business_name: row.business_name,
    email: row.email,
    phone: row.mobile,
    mobile: row.mobile,
    status: row.status,
    rejection_reason: row.notes || '',
    category_id: row.category_id,
    city_id: row.city_id,
    area_id: row.area_id,
    ...extra,
  };
}

/** Admin Vendors list reads `vendors`, not `vendor_applications`. Create a pending vendor row so onboarding shows up there. */
async function ensurePendingVendorForApplication(data: {
  name: string;
  business_name: string;
  email: string;
  mobile: string;
  category_id: string | null;
  city_id: string | null;
  area_id: string | null;
}) {
  const existing = await prisma.vendor.findFirst({
    where: { OR: [{ email: data.email }, { mobile: data.mobile }] },
  });
  if (existing) return;

  await prisma.vendor.create({
    data: {
      name: data.name,
      business_name: data.business_name,
      email: data.email,
      mobile: data.mobile,
      status: 'pending',
      category_id: data.category_id,
      city_id: data.city_id,
      area_id: data.area_id,
    },
  });
}

const router = Router();

router.get('/mine', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let row: VendorApplication | null = null;
    try {
      row = await prisma.vendorApplication.findFirst({
        where: {
          documents: {
            path: ['customer_id'],
            equals: req.user!.id,
          },
        },
        orderBy: { created_at: 'desc' },
      });
    } catch {
      row = null;
    }
    if (!row) {
      const customer = await prisma.customer.findUnique({ where: { id: req.user!.id } });
      if (customer?.email) {
        row = await prisma.vendorApplication.findFirst({
          where: { email: customer.email },
          orderBy: { created_at: 'desc' },
        });
      }
    }
    if (!row) {
      sendSuccess(res, null);
      return;
    }
    sendSuccess(res, toDto(row));
  } catch (e) {
    next(e);
  }
});

router.post('/', optionalAuth, validate(createBodySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const mobile = String(body.phone || body.mobile || '');
    if (!mobile) throw new AppError('phone or mobile is required', 400);

    const customerId = req.user?.role === 'customer' ? req.user.id : undefined;
    const documents = documentsFromBody(body, customerId);

    const uuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);

    const category_id = uuid(body.category_id) ? String(body.category_id) : null;
    const city_id = uuid(body.city_id) ? String(body.city_id) : null;
    const area_id = uuid(body.area_id) ? String(body.area_id) : null;

    await prisma.vendorApplication.create({
      data: {
        name: String(body.name),
        business_name: String(body.business_name),
        email: String(body.email),
        mobile,
        category_id,
        city_id,
        area_id,
        documents: documents as Prisma.InputJsonValue,
        status: typeof body.status === 'string' ? body.status : 'pending',
      },
    });

    await ensurePendingVendorForApplication({
      name: String(body.name),
      business_name: String(body.business_name),
      email: String(body.email),
      mobile,
      category_id,
      city_id,
      area_id,
    });

    sendCreated(res, { success: true }, 'Application submitted');
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authenticate, isCustomer, validate(patchBodySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.vendorApplication.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Not found', 404);

    const prevDoc = (existing.documents && typeof existing.documents === 'object' && !Array.isArray(existing.documents))
      ? (existing.documents as Record<string, unknown>)
      : {};
    if (prevDoc.customer_id !== req.user!.id) {
      throw new AppError('Forbidden', 403);
    }

    const body = req.body as Record<string, unknown>;
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!TOP_LEVEL.has(k)) extra[k] = v;
    }
    const mergedDoc = { ...prevDoc, ...extra, customer_id: req.user!.id };

    const mobile = body.phone || body.mobile;
    const uuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);

    const updated = await prisma.vendorApplication.update({
      where: { id: req.params.id },
      data: {
        name: body.name !== undefined ? String(body.name) : existing.name,
        business_name: body.business_name !== undefined ? String(body.business_name) : existing.business_name,
        email: body.email !== undefined ? String(body.email) : existing.email,
        mobile: mobile !== undefined ? String(mobile) : existing.mobile,
        category_id: body.category_id !== undefined
          ? (uuid(body.category_id) ? String(body.category_id) : null)
          : existing.category_id,
        city_id: body.city_id !== undefined ? (uuid(body.city_id) ? String(body.city_id) : null) : existing.city_id,
        area_id: body.area_id !== undefined ? (uuid(body.area_id) ? String(body.area_id) : null) : existing.area_id,
        documents: mergedDoc as Prisma.InputJsonValue,
        ...(typeof body.status === 'string' ? { status: body.status } : {}),
      },
    });
    sendSuccess(res, toDto(updated));
  } catch (e) {
    next(e);
  }
});

export default router;
