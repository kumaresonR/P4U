import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendPaginated, sendCreated } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { isCustomer } from '../../middleware/rbac';
import { getPagination } from '../../utils/pagination';
import { validate } from '../../middleware/validate';
import { uploadAny } from '../../middleware/upload';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types';
import * as customerSvc from '../customers/customers.service';
import * as mediaSvc from '../media/media.service';
import { submitKycSchema, updateKycDocSchema, savedSearchNotifySchema } from '../customers/customers.schema';

const router = Router();

// GET /api/v1/profile/public/health
router.get('/public/health', (_req, res) => res.json({ status: 'ok' }));

// ─── My Profile ───────────────────────────────────────────────────────────────

router.get('/me', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.getCustomer(req.user!.id)); } catch (e) { next(e); }
});

router.patch('/me', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.updateCustomer(req.user!.id, req.body)); } catch (e) { next(e); }
});

router.get('/customers/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.getCustomer(req.params.id)); } catch (e) { next(e); }
});

// ─── Addresses ────────────────────────────────────────────────────────────────

router.get('/me/addresses', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.getAddresses(req.user!.id)); } catch (e) { next(e); }
});

router.post('/me/addresses', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.addAddress(req.user!.id, req.body), 'Address added', 201); } catch (e) { next(e); }
});

router.put('/me/addresses/:addressId', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.updateAddress(req.params.addressId, req.body)); } catch (e) { next(e); }
});

router.delete('/me/addresses/:addressId', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await customerSvc.deleteAddress(req.params.addressId); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// ─── Wishlist ─────────────────────────────────────────────────────────────────

router.get('/me/wishlist', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.getWishlist(req.user!.id)); } catch (e) { next(e); }
});

router.post('/me/wishlist', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await customerSvc.addToWishlist(req.user!.id, req.body.product_id);
    sendSuccess(res, null, 'Added to wishlist');
  } catch (e) { next(e); }
});

router.delete('/me/wishlist/:productId', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await customerSvc.removeFromWishlist(req.user!.id, req.params.productId); sendSuccess(res, null, 'Removed'); } catch (e) { next(e); }
});

// ─── Referrals ────────────────────────────────────────────────────────────────

router.get('/me/referral-code', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user!.id },
      select: { referral_code: true },
    });
    sendSuccess(res, { referral_code: customer?.referral_code || '' });
  } catch (e) { next(e); }
});

router.get('/me/referrals', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const customer = await prisma.customer.findUnique({
      where: { id: req.user!.id },
      select: { referral_code: true },
    });
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where: { referred_by: customer?.referral_code || '__none__' },
        skip, take: limit,
        select: { id: true, name: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.customer.count({ where: { referred_by: customer?.referral_code || '__none__' } }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

// ─── Reward Points (Wallet) ───────────────────────────────────────────────────

router.get('/me/reward-points', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.getWallet(req.user!.id)); } catch (e) { next(e); }
});

// ─── Profile Stats ───────────────────────────────────────────────────────────

router.get('/stats', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const [orders, wishlist, points, addresses] = await Promise.all([
      prisma.order.count({ where: { customer_id: userId } }),
      prisma.wishlistItem.count({ where: { customer_id: userId } }),
      prisma.customer.findUnique({ where: { id: userId }, select: { wallet_points: true } }),
      prisma.customerAddress.count({ where: { customer_id: userId } }),
    ]);
    sendSuccess(res, { total_orders: orders, wishlist_count: wishlist, wallet_points: points?.wallet_points || 0, total_addresses: addresses });
  } catch (e) { next(e); }
});

// ─── Platform Fees ───────────────────────────────────────────────────────────

router.get('/platform-fees', authenticate, isCustomer, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vars = await prisma.platformVariable.findMany({
      where: {
        key: {
          in: ['platform_fee', 'delivery_fee', 'convenience_fee', 'gst_percentage', 'platform_fee_gst_percent'],
        },
      },
    });
    sendSuccess(res, vars.map((v) => ({ key: v.key, value: v.value })));
  } catch (e) { next(e); }
});

// ─── Account Actions ─────────────────────────────────────────────────────────

router.post('/deactivate', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.customer.update({ where: { id: req.user!.id }, data: { status: 'inactive' } });
    sendSuccess(res, null, 'Account deactivated');
  } catch (e) { next(e); }
});

router.post('/delete-request', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.customer.update({ where: { id: req.user!.id }, data: { status: 'suspended' } });
    sendSuccess(res, null, 'Deletion request submitted');
  } catch (e) { next(e); }
});

// ─── Saved Searches ──────────────────────────────────────────────────────────

router.get('/saved-searches', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const searches = await prisma.savedSearch.findMany({ where: { customer_id: req.user!.id }, orderBy: { created_at: 'desc' } });
    sendSuccess(res, searches);
  } catch (e) { next(e); }
});

router.post('/saved-searches', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = await prisma.savedSearch.create({ data: { customer_id: req.user!.id, ...req.body } });
    sendSuccess(res, search, 'Saved', 201);
  } catch (e) { next(e); }
});

router.delete('/saved-searches/:id', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await customerSvc.deleteSavedSearch(req.user!.id, req.params.id);
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
});

router.patch('/saved-searches/:id', authenticate, isCustomer, validate(savedSearchNotifySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await customerSvc.patchSavedSearchNotify(req.user!.id, req.params.id, req.body.notify);
    sendSuccess(res, updated);
  } catch (e) { next(e); }
});

// ─── KYC (customer app paths) ────────────────────────────────────────────────

router.post('/kyc-upload', authenticate, isCustomer, uploadAny.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file provided', 400);
    const { url } = await mediaSvc.uploadDocument(req.file, undefined, undefined);
    sendCreated(res, { url }, 'Uploaded');
  } catch (e) { next(e); }
});

router.get('/kyc-documents', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.getMyKyc(req.user!.id)); } catch (e) { next(e); }
});

router.post('/kyc-documents', authenticate, isCustomer, validate(submitKycSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.submitKyc(req.user!.id, req.body), 'KYC submitted', 201); } catch (e) { next(e); }
});

router.patch('/kyc-documents/:docId', authenticate, isCustomer, validate(updateKycDocSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await customerSvc.updateKycDocument(req.user!.id, req.params.docId, req.body));
  } catch (e) { next(e); }
});

// ─── Addresses (alternate path) ──────────────────────────────────────────────

router.get('/addresses', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.getAddresses(req.user!.id)); } catch (e) { next(e); }
});

router.post('/addresses', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.addAddress(req.user!.id, req.body), 'Address added', 201); } catch (e) { next(e); }
});

router.patch('/addresses/:addressId', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.updateAddress(req.params.addressId, req.body)); } catch (e) { next(e); }
});

router.put('/addresses/:addressId', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await customerSvc.updateAddress(req.params.addressId, req.body)); } catch (e) { next(e); }
});

export default router;
