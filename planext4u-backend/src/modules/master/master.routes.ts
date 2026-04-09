import { Router } from 'express';
import * as ctrl from './master.controller';
import { authenticate } from '../../middleware/auth';
import { isAdmin } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  citySchema, areaSchema, occupationSchema, categorySchema,
  serviceCategorySchema, taxConfigSchema, vendorPlanSchema, platformVariableSchema,
} from './master.schema';

const router = Router();

// Public read endpoints
router.get('/cities',             ctrl.listCities);
router.get('/areas',              ctrl.listAreas);
router.get('/occupations',        ctrl.listOccupations);
router.get('/categories',         ctrl.listCategories);
router.get('/service-categories', ctrl.listServiceCategories);
router.get('/tax-configs',        ctrl.listTaxConfigs);
router.get('/vendor-plans',       ctrl.listVendorPlans);

// Admin-only write endpoints
router.post('/cities',              authenticate, isAdmin, validate(citySchema), ctrl.addCity);
router.put('/cities/:id',           authenticate, isAdmin, validate(citySchema.partial()), ctrl.editCity);
router.delete('/cities/:id',        authenticate, isAdmin, ctrl.removeCity);

router.post('/areas',               authenticate, isAdmin, validate(areaSchema), ctrl.addArea);
router.put('/areas/:id',            authenticate, isAdmin, validate(areaSchema.partial()), ctrl.editArea);
router.delete('/areas/:id',         authenticate, isAdmin, ctrl.removeArea);

router.post('/occupations',         authenticate, isAdmin, validate(occupationSchema), ctrl.addOccupation);
router.put('/occupations/:id',      authenticate, isAdmin, validate(occupationSchema.partial()), ctrl.editOccupation);
router.delete('/occupations/:id',   authenticate, isAdmin, ctrl.removeOccupation);

router.post('/categories',          authenticate, isAdmin, validate(categorySchema), ctrl.addCategory);
router.put('/categories/:id',       authenticate, isAdmin, validate(categorySchema.partial()), ctrl.editCategory);
router.delete('/categories/:id',    authenticate, isAdmin, ctrl.removeCategory);

router.post('/service-categories',        authenticate, isAdmin, validate(serviceCategorySchema), ctrl.addServiceCategory);
router.put('/service-categories/:id',     authenticate, isAdmin, validate(serviceCategorySchema.partial()), ctrl.editServiceCategory);
router.delete('/service-categories/:id',  authenticate, isAdmin, ctrl.removeServiceCategory);

router.post('/tax-configs',         authenticate, isAdmin, validate(taxConfigSchema), ctrl.addTaxConfig);
router.put('/tax-configs/:id',      authenticate, isAdmin, validate(taxConfigSchema.partial()), ctrl.editTaxConfig);
router.delete('/tax-configs/:id',   authenticate, isAdmin, ctrl.removeTaxConfig);

router.get('/platform-variables',        authenticate, isAdmin, ctrl.listPlatformVariables);
router.put('/platform-variables/:id',   authenticate, isAdmin, ctrl.setPlatformVar);
router.post('/platform-variables',      authenticate, isAdmin, validate(platformVariableSchema), ctrl.setPlatformVar);

// States & Districts
router.get('/states', async (_req, res, next) => {
  try {
    const { prisma } = await import('../../config/database');
    const states = await prisma.state.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: states });
  } catch (e) { next(e); }
});
router.get('/districts', async (req, res, next) => {
  try {
    const { prisma } = await import('../../config/database');
    const { state_id } = req.query as Record<string, string>;
    const districts = await prisma.district.findMany({
      where: state_id ? { state_id } : {},
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: districts });
  } catch (e) { next(e); }
});

// Bulk delete categories
router.post('/categories/bulk-delete', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { prisma } = await import('../../config/database');
    await prisma.category.deleteMany({ where: { id: { in: req.body.ids } } });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
});

router.post('/vendor-plans',        authenticate, isAdmin, validate(vendorPlanSchema), ctrl.addVendorPlan);
router.put('/vendor-plans/:id',     authenticate, isAdmin, validate(vendorPlanSchema.partial()), ctrl.editVendorPlan);
router.delete('/vendor-plans/:id',  authenticate, isAdmin, ctrl.removeVendorPlan);

// Google Maps helpers (public)
router.get('/maps/geocode',          ctrl.geocodeAddress);
router.get('/maps/reverse-geocode',  ctrl.reverseGeocodeCoords);
router.get('/maps/autocomplete',     ctrl.placeAutocomplete);

export default router;
