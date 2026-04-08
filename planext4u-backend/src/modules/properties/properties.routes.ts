import { Router } from 'express';
import * as ctrl from './properties.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createPropertySchema, updatePropertySchema, emiCalculatorSchema,
  savedSearchSchema, propertyMessageSchema, rentTrackerSchema, rentPaymentSchema,
  rentPaidMonthsUpdateSchema,
  propertyEnquirySchema, propertyVisitSchema, propertyReportSchema,
  propertyLocalitySchema, propertyAmenityAdminSchema, propertyFilterOptionAdminSchema,
  propertyPlanAdminSchema, propertyReportStatusSchema, propertyStatusBodySchema,
} from './properties.schema';

const router = Router();

// Public (static paths first — never register /:id before /admin or /my)
router.get('/search',          optionalAuth, ctrl.search);
router.post('/emi-calculator',  validate(emiCalculatorSchema), ctrl.emiCalc);

// Customer — /my/*
router.get('/my/listings',              authenticate, isCustomer, ctrl.myProperties);
router.get('/my/chat-threads',          authenticate, isCustomer, ctrl.myChatThreads);
router.get('/my/saved-searches',         authenticate, isCustomer, ctrl.getSavedSearches);
router.post('/my/saved-searches',        authenticate, isCustomer, validate(savedSearchSchema), ctrl.saveSearch);
router.delete('/my/saved-searches/:id',  authenticate, isCustomer, ctrl.deleteSearch);
router.get('/my/rent-tracker',           authenticate, isCustomer, ctrl.getRentTrackers);
router.post('/my/rent-tracker',          authenticate, isCustomer, validate(rentTrackerSchema), ctrl.createRentTracker);
router.patch('/my/rent-tracker/:trackerId', authenticate, isCustomer, validate(rentPaidMonthsUpdateSchema), ctrl.patchRentPaidMonths);
router.delete('/my/rent-tracker/:trackerId', authenticate, isCustomer, ctrl.removeRentTracker);
router.post('/my/rent-tracker/:trackerId/payments', authenticate, isCustomer, validate(rentPaymentSchema), ctrl.addRentPayment);
router.post('/my/bookmarks/:id',  authenticate, isCustomer, ctrl.bookmark);
router.get('/my/bookmarks',       authenticate, isCustomer, ctrl.myBookmarks);

// Admin — /admin/* (must be before /:id)
router.get('/admin/all',     authenticate, isAdmin, ctrl.adminList);
router.get('/admin/reports',   authenticate, isAdmin, ctrl.allReports);
router.get('/admin/property-reports', authenticate, isAdmin, ctrl.listPropertyReportsFull);
router.patch('/admin/property-reports/:rid', authenticate, isAdmin, validate(propertyReportStatusSchema), ctrl.patchPropertyReport);

router.get('/admin/localities', authenticate, isAdmin, ctrl.adminListLocalities);
router.post('/admin/localities', authenticate, isAdmin, validate(propertyLocalitySchema), ctrl.adminCreateLocality);
router.put('/admin/localities/:lid', authenticate, isAdmin, validate(propertyLocalitySchema.partial()), ctrl.adminUpdateLocality);
router.delete('/admin/localities/:lid', authenticate, isAdmin, ctrl.adminDeleteLocality);

router.get('/admin/amenities', authenticate, isAdmin, ctrl.adminListAmenities);
router.post('/admin/amenities', authenticate, isAdmin, validate(propertyAmenityAdminSchema), ctrl.adminCreateAmenity);
router.put('/admin/amenities/:aid', authenticate, isAdmin, validate(propertyAmenityAdminSchema.partial()), ctrl.adminUpdateAmenity);
router.delete('/admin/amenities/:aid', authenticate, isAdmin, ctrl.adminDeleteAmenity);

router.get('/admin/filter-options', authenticate, isAdmin, ctrl.adminListFilterOptions);
router.post('/admin/filter-options', authenticate, isAdmin, validate(propertyFilterOptionAdminSchema), ctrl.adminCreateFilterOption);
router.put('/admin/filter-options/:fid', authenticate, isAdmin, validate(propertyFilterOptionAdminSchema.partial()), ctrl.adminUpdateFilterOption);
router.delete('/admin/filter-options/:fid', authenticate, isAdmin, ctrl.adminDeleteFilterOption);

router.get('/admin/property-plans', authenticate, isAdmin, ctrl.adminListPropertyPlans);
router.post('/admin/property-plans', authenticate, isAdmin, validate(propertyPlanAdminSchema), ctrl.adminCreatePropertyPlan);
router.put('/admin/property-plans/:pid', authenticate, isAdmin, validate(propertyPlanAdminSchema.partial()), ctrl.adminUpdatePropertyPlan);
router.delete('/admin/property-plans/:pid', authenticate, isAdmin, ctrl.adminDeletePropertyPlan);

// Customer create property
router.post('/',                         authenticate, isCustomer, validate(createPropertySchema), ctrl.create);

// Dynamic :id routes
router.get('/:id/messages/with/:otherUserId', authenticate, isCustomer, ctrl.getMessagesBetween);
router.get('/:id/messages',              authenticate, ctrl.getMessages);
router.post('/:id/messages',             authenticate, isCustomer, validate(propertyMessageSchema), ctrl.sendMessage);

router.post('/:id/enquiry',            authenticate, isCustomer, validate(propertyEnquirySchema), ctrl.createEnquiry);
router.get('/:id/enquiries',           authenticate, ctrl.getEnquiries);

router.post('/:id/visit',          authenticate, isCustomer, validate(propertyVisitSchema), ctrl.scheduleVisit);
router.get('/:id/visits',          authenticate, ctrl.getVisits);

router.post('/:id/report',     authenticate, isCustomer, validate(propertyReportSchema), ctrl.report);

router.put('/enquiries/:enquiryId',    authenticate, isAdmin, ctrl.updateEnquiry);
router.put('/visits/:visitId',     authenticate, isAdmin, ctrl.updateVisit);

router.put('/:id/status',    authenticate, isAdmin, validate(propertyStatusBodySchema), ctrl.updateStatus);
router.put('/:id',                       authenticate, validate(updatePropertySchema), ctrl.update);
router.delete('/:id',                    authenticate, ctrl.remove);

router.get('/:id',              optionalAuth, ctrl.get);

export default router;
