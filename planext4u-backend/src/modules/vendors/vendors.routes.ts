import { Router } from 'express';
import * as ctrl from './vendors.controller';
import { authenticate } from '../../middleware/auth';
import { isAdmin, isVendor, isServiceVendor } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { registerVendorSchema, updateVendorSchema, updateVendorStatusSchema, updateBankSchema } from './vendors.schema';

const router = Router();

// Public registration
router.post('/register',              validate(registerVendorSchema), ctrl.register);
router.post('/service-vendors/register', validate(registerVendorSchema), ctrl.registerSvc);

// Vendor self-service
router.get('/me',            authenticate, isVendor, ctrl.getMe);
router.put('/me',            authenticate, isVendor, validate(updateVendorSchema), ctrl.updateMe);
router.get('/me/dashboard',  authenticate, isVendor, ctrl.dashboard);
router.put('/me/bank',       authenticate, isVendor, validate(updateBankSchema), ctrl.updateBank);

// Service vendor self-service
router.get('/service-vendors/me',       authenticate, isServiceVendor, ctrl.getSvc);
router.put('/service-vendors/me',       authenticate, isServiceVendor, validate(updateVendorSchema), ctrl.updateSvcMe);
router.get('/service-vendors/me/dashboard', authenticate, isServiceVendor, ctrl.svcDashboard);
router.put('/service-vendors/me/bank',  authenticate, isServiceVendor, validate(updateBankSchema), ctrl.updateSvcBank);

// Admin — product vendors
router.post('/',                 authenticate, isAdmin, validate(registerVendorSchema), ctrl.register);
router.get('/',                  authenticate, isAdmin, ctrl.list);
router.get('/:id',               authenticate, isAdmin, ctrl.get);
router.put('/:id',               authenticate, isAdmin, ctrl.update);
router.put('/:id/status',        authenticate, isAdmin, validate(updateVendorStatusSchema), ctrl.updateStatus);
router.delete('/:id',            authenticate, isAdmin, ctrl.remove);
router.post('/bulk-delete',      authenticate, isAdmin, ctrl.bulkDelete);
router.post('/bulk-status',      authenticate, isAdmin, ctrl.bulkStatus);
router.get('/:id/dashboard',     authenticate, isAdmin, ctrl.dashboard);

// Admin — service vendors
router.get('/service-vendors',          authenticate, isAdmin, ctrl.listSvc);
router.get('/service-vendors/:id',      authenticate, isAdmin, ctrl.getSvc);
router.put('/service-vendors/:id',      authenticate, isAdmin, ctrl.updateSvc);
router.put('/service-vendors/:id/status', authenticate, isAdmin, ctrl.updateSvcStatus);

export default router;
