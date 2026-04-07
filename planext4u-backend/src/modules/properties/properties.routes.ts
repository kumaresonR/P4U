import { Router } from 'express';
import * as ctrl from './properties.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createPropertySchema, updatePropertySchema, emiCalculatorSchema,
  savedSearchSchema, propertyMessageSchema, rentTrackerSchema, rentPaymentSchema,
  propertyEnquirySchema, propertyVisitSchema, propertyReportSchema,
} from './properties.schema';

const router = Router();

// Public
router.get('/search',          optionalAuth, ctrl.search);
router.post('/emi-calculator',  validate(emiCalculatorSchema), ctrl.emiCalc);
router.get('/:id',              optionalAuth, ctrl.get);

// Customer
router.get('/my/listings',              authenticate, isCustomer, ctrl.myProperties);
router.post('/',                         authenticate, isCustomer, validate(createPropertySchema), ctrl.create);
router.put('/:id',                       authenticate, validate(updatePropertySchema), ctrl.update);
router.delete('/:id',                    authenticate, ctrl.remove);
router.get('/:id/messages',              authenticate, ctrl.getMessages);
router.post('/:id/messages',             authenticate, isCustomer, validate(propertyMessageSchema), ctrl.sendMessage);
router.get('/my/saved-searches',         authenticate, isCustomer, ctrl.getSavedSearches);
router.post('/my/saved-searches',        authenticate, isCustomer, validate(savedSearchSchema), ctrl.saveSearch);
router.delete('/my/saved-searches/:id',  authenticate, isCustomer, ctrl.deleteSearch);
router.get('/my/rent-tracker',           authenticate, isCustomer, ctrl.getRentTrackers);
router.post('/my/rent-tracker',          authenticate, isCustomer, validate(rentTrackerSchema), ctrl.createRentTracker);
router.post('/my/rent-tracker/:trackerId/payments', authenticate, isCustomer, validate(rentPaymentSchema), ctrl.addRentPayment);

// Bookmarks
router.post('/my/bookmarks/:id',  authenticate, isCustomer, ctrl.bookmark);
router.get('/my/bookmarks',       authenticate, isCustomer, ctrl.myBookmarks);

// Enquiries
router.post('/:id/enquiry',            authenticate, isCustomer, validate(propertyEnquirySchema), ctrl.createEnquiry);
router.get('/:id/enquiries',           authenticate, ctrl.getEnquiries);
router.put('/enquiries/:enquiryId',    authenticate, isAdmin, ctrl.updateEnquiry);

// Visits
router.post('/:id/visit',          authenticate, isCustomer, validate(propertyVisitSchema), ctrl.scheduleVisit);
router.get('/:id/visits',          authenticate, ctrl.getVisits);
router.put('/visits/:visitId',     authenticate, isAdmin, ctrl.updateVisit);

// Reports
router.post('/:id/report',     authenticate, isCustomer, validate(propertyReportSchema), ctrl.report);
router.get('/admin/reports',   authenticate, isAdmin, ctrl.allReports);

// Admin
router.get('/admin/all',     authenticate, isAdmin, ctrl.adminList);
router.put('/:id/status',    authenticate, isAdmin, ctrl.updateStatus);

export default router;
