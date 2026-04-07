import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { isCustomer } from '../../middleware/rbac';
import { getPagination } from '../../utils/pagination';
import { AuthRequest } from '../../types';
import * as customerSvc from '../customers/customers.service';

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

export default router;
