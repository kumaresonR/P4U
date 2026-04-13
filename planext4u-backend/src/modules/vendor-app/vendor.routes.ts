import { Router, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { isVendor } from '../../middleware/rbac';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types';
import { prisma } from '../../config/database';
import { uploadAny } from '../../middleware/upload';
import { uploadFile, deleteFile } from '../../services/storage';
import * as vendorSvc from '../vendors/vendors.service';
import * as orderSvc from '../orders/orders.service';
import * as productSvc from '../products/products.service';

const router = Router();

// GET /api/v1/vendor/public/health
router.get('/public/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Vendor Self-service ──────────────────────────────────────────────────────

router.get('/me', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendor(req.user!.id)); } catch (e) { next(e); }
});

// alias: frontend calls /vendor/profile
router.get('/profile', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendor(req.user!.id)); } catch (e) { next(e); }
});

router.patch('/me', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.updateVendor(req.user!.id, req.body)); } catch (e) { next(e); }
});

router.patch('/profile', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.updateVendor(req.user!.id, req.body)); } catch (e) { next(e); }
});

// ─── Vendor Dashboard ────────────────────────────────────────────────────────

router.get('/dashboard', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await vendorSvc.getVendorDashboard(req.user!.id)); } catch (e) { next(e); }
});

// ─── Vendor Products ─────────────────────────────────────────────────────────

router.get('/products', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    (req as any).query.vendor_id = req.user!.id;
    const r = await productSvc.listProducts(req as any);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

// ─── Vendor Settlements ───────────────────────────────────────────────────────

router.get('/settlements', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await orderSvc.getVendorSettlements(req.user!.id, req as any);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

// ─── Vendor Registration ──────────────────────────────────────────────────────

router.post('/register', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await vendorSvc.registerVendor(req.body), 'Vendor registered, pending approval'); } catch (e) { next(e); }
});

router.get('/register/status', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorSvc.getVendor(req.user!.id);
    sendSuccess(res, { status: vendor.status, rejection_reason: vendor.rejection_reason });
  } catch (e) { next(e); }
});

// ─── Vendor Orders ────────────────────────────────────────────────────────────

router.get('/orders', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Inject vendor_id into query for listOrders
    (req as any).query.vendor_id = req.user!.id;
    const r = await orderSvc.listOrders(req as any);
    sendPaginated(res, r.data, r.total, r.page, r.limit);
  } catch (e) { next(e); }
});

router.get('/orders/:id', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.getOrder(req.params.id)); } catch (e) { next(e); }
});

router.patch('/orders/:id', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await orderSvc.updateOrderStatus(req.params.id, req.body.status)); } catch (e) { next(e); }
});

// ─── Vendor Reviews ───────────────────────────────────────────────────────────

router.get('/reviews/by-order/:orderId', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { order_id: req.params.orderId },
      orderBy: { created_at: 'desc' },
    });
    sendSuccess(res, reviews);
  } catch (e) { next(e); }
});

// ─── Platform variables (publishable keys for checkout) ─────────────────────

router.get('/platform-vars', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const keysParam = (req.query.keys as string) || 'razorpay_key_id';
    const keys = keysParam.split(',').map((k) => k.trim()).filter(Boolean);
    const allowed = new Set(['razorpay_key_id', 'platform_fee', 'gst_percentage']);
    const safeKeys = keys.filter((k) => allowed.has(k));
    const vars = await prisma.platformVariable.findMany({
      where: { key: { in: safeKeys.length ? safeKeys : ['razorpay_key_id'] } },
    });
    sendSuccess(res, vars.map((v) => ({ key: v.key, value: v.value })));
  } catch (e) { next(e); }
});

// ─── Plan / company bank (frontend VendorProfilePage) ─────────────────────────

router.get('/plans/:id', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.vendorPlan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw new AppError('Plan not found', 404);
    sendSuccess(res, { ...plan, plan_name: plan.name });
  } catch (e) { next(e); }
});

router.get('/company-bank-details', authenticate, isVendor, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vars = await prisma.platformVariable.findMany({
      where: {
        OR: [
          { key: { contains: 'bank' } },
          { key: { contains: 'upi' } },
          { key: { contains: 'account' } },
        ],
      },
    });
    sendSuccess(res, vars);
  } catch (e) { next(e); }
});

router.post('/background-image', authenticate, isVendor, uploadAny.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const f = (req as any).file as Express.Multer.File | undefined;
    if (!f) throw new AppError('No file provided', 400);
    const { url } = await uploadFile(f.buffer, f.mimetype, f.originalname, 'vendor-backgrounds');
    await prisma.vendor.update({
      where: { id: req.user!.id },
      data: { shop_photo_url: url },
    });
    sendSuccess(res, { url }, 'Updated');
  } catch (e) { next(e); }
});

// ─── Media library (vendor-scoped; mirrors admin routes under /vendor) ─────

router.get('/media-library', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { folder, per_page = '50' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { vendor_id: req.user!.id };
    if (folder) where.folder = { contains: folder, mode: 'insensitive' };
    const items = await prisma.mediaLibrary.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Math.min(parseInt(per_page, 10) || 50, 200),
    });
    sendSuccess(res, items);
  } catch (e) { next(e); }
});

router.post('/media-library/upload', authenticate, isVendor, uploadAny.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const f = (req as any).file as Express.Multer.File | undefined;
    if (!f) throw new AppError('No file provided', 400);
    const body = req.body as { folder?: string };
    const folder = (body?.folder as string) || `vendor-${req.user!.id}/general`;
    const { url, key } = await uploadFile(f.buffer, f.mimetype, f.originalname, folder);
    const isImage = f.mimetype.startsWith('image/');
    const media = await prisma.mediaLibrary.create({
      data: {
        file_url: url,
        s3_key: key,
        file_type: isImage ? 'image' : f.mimetype.startsWith('video/') ? 'video' : 'document',
        file_size: f.size,
        file_name: f.originalname,
        folder,
        vendor_id: req.user!.id,
        uploaded_by: req.user!.id,
      },
    });
    sendSuccess(res, media, 'Uploaded', 201);
  } catch (e) { next(e); }
});

router.delete('/media-library/:id', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const media = await prisma.mediaLibrary.findFirst({
      where: { id: req.params.id, vendor_id: req.user!.id },
    });
    if (!media) throw new AppError('Media not found', 404);
    if (media.s3_key) {
      try { await deleteFile(media.s3_key); } catch { /* ignore */ }
    }
    await prisma.mediaLibrary.delete({ where: { id: media.id } });
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

// ─── Bank accounts (single row per vendor in DB — expose as list for UI) ──────

router.get('/bank-accounts', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const v = await prisma.vendor.findUnique({
      where: { id: req.user!.id },
      include: { bankAccount: true },
    });
    if (!v?.bankAccount || !v.bankAccount.account_number) {
      sendSuccess(res, []);
      return;
    }
    const b = v.bankAccount;
    sendSuccess(res, [{
      id: b.id,
      vendor_id: v.id,
      bank_name: b.bank_name,
      account_holder: v.business_name || v.name,
      account_number: b.account_number,
      ifsc_code: b.ifsc_code,
      account_type: 'savings',
      is_primary: true,
      created_at: b.created_at.toISOString(),
    }]);
  } catch (e) { next(e); }
});

router.post('/bank-accounts', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bank_name, account_number, ifsc_code, upi_id } = req.body as Record<string, string>;
    if (!bank_name || !account_number || !ifsc_code) throw new AppError('bank_name, account_number, ifsc_code required', 400);
    await vendorSvc.updateBankDetails(req.user!.id, {
      bank_name,
      account_number,
      ifsc_code,
      upi_id: upi_id || undefined,
    });
    sendSuccess(res, null, 'Saved', 201);
  } catch (e) { next(e); }
});

router.patch('/bank-accounts/:id/primary', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const b = await prisma.vendorBankAccount.findFirst({ where: { id: req.params.id, vendor_id: req.user!.id } });
    if (!b) throw new AppError('Not found', 404);
    sendSuccess(res, null, 'Primary updated');
  } catch (e) { next(e); }
});

router.delete('/bank-accounts/:id', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const r = await prisma.vendorBankAccount.deleteMany({ where: { id: req.params.id, vendor_id: req.user!.id } });
    if (r.count === 0) throw new AppError('Not found', 404);
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

// ─── Account control ─────────────────────────────────────────────────────────

router.post('/account/deactivate', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.vendor.update({ where: { id: req.user!.id }, data: { status: 'inactive' } });
    sendSuccess(res, null, 'Account deactivated');
  } catch (e) { next(e); }
});

router.post('/account/delete-request', authenticate, isVendor, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'delete_requested';
    await prisma.vendor.update({
      where: { id: req.user!.id },
      data: { status: 'suspended', rejection_reason: reason },
    });
    sendSuccess(res, null, 'Deletion request submitted');
  } catch (e) { next(e); }
});

export default router;
