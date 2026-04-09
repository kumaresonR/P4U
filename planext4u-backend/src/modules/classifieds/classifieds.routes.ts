import { Router } from 'express';
import * as ctrl from './classifieds.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createClassifiedSchema, updateClassifiedSchema, updateClassifiedStatusSchema } from './classifieds.schema';

const router = Router();

router.get('/browse',      optionalAuth, ctrl.browse);
router.get('/my',          authenticate, isCustomer, ctrl.myAds);
router.post('/',           authenticate, isCustomer, validate(createClassifiedSchema), ctrl.create);
router.put('/:id',         authenticate, validate(updateClassifiedSchema), ctrl.update);
router.delete('/:id',      authenticate, ctrl.remove);
router.get('/:id',         optionalAuth, ctrl.get);

// Admin
router.get('/',                  authenticate, isAdmin, ctrl.list);
router.put('/:id/status',        authenticate, isAdmin, validate(updateClassifiedStatusSchema), ctrl.updateStatus);
router.post('/bulk-status', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    const { prisma } = await import('../../config/database');
    await prisma.classifiedAd.updateMany({ where: { id: { in: ids } }, data: { status } });
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
});

// Categories for classifieds
router.get('/categories', async (_req, res, next) => {
  try {
    const { prisma } = await import('../../config/database');
    const cats = await prisma.category.findMany({ where: { status: 'active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: cats });
  } catch (e) { next(e); }
});

export default router;
