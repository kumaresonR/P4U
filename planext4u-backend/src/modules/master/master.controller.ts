import { Request, Response, NextFunction } from 'express';
import * as svc from './master.service';
import { geocode, reverseGeocode, getPlaceAutocomplete } from '../../services/maps';
import { sendSuccess, sendCreated } from '../../utils/response';

// ─── Cities ───────────────────────────────────────────────────────────────────
export const listCities = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getCities()); } catch (e) { next(e); }
};
export const addCity = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.createCity(req.body)); } catch (e) { next(e); }
};
export const editCity = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateCity(req.params.id, req.body)); } catch (e) { next(e); }
};
export const removeCity = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteCity(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

// ─── Areas ────────────────────────────────────────────────────────────────────
export const listAreas = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getAreas(req.query.city_id as string)); } catch (e) { next(e); }
};
export const addArea = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.createArea(req.body)); } catch (e) { next(e); }
};
export const editArea = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateArea(req.params.id, req.body)); } catch (e) { next(e); }
};
export const removeArea = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteArea(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

// ─── Occupations ─────────────────────────────────────────────────────────────
export const listOccupations = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getOccupations()); } catch (e) { next(e); }
};
export const addOccupation = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.createOccupation(req.body.name)); } catch (e) { next(e); }
};
export const editOccupation = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateOccupation(req.params.id, req.body)); } catch (e) { next(e); }
};
export const removeOccupation = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteOccupation(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const listCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parentId = req.query.parent_id === 'null' ? null : req.query.parent_id as string | undefined;
    sendSuccess(res, await svc.getCategories(parentId));
  } catch (e) { next(e); }
};
export const addCategory = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.createCategory(req.body)); } catch (e) { next(e); }
};
export const editCategory = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateCategory(req.params.id, req.body)); } catch (e) { next(e); }
};
export const removeCategory = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteCategory(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

// ─── Service Categories ───────────────────────────────────────────────────────
export const listServiceCategories = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getServiceCategories()); } catch (e) { next(e); }
};
export const addServiceCategory = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.createServiceCategory(req.body)); } catch (e) { next(e); }
};
export const editServiceCategory = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateServiceCategory(req.params.id, req.body)); } catch (e) { next(e); }
};
export const removeServiceCategory = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteServiceCategory(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

// ─── Tax ──────────────────────────────────────────────────────────────────────
export const listTaxConfigs = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getTaxConfigs()); } catch (e) { next(e); }
};

export const listTaxSlabs = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getTaxSlabs()); } catch (e) { next(e); }
};

export const listProductAttributesPublic = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getProductAttributesPublic()); } catch (e) { next(e); }
};

export const listProductAttributeValuesPublic = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getProductAttributeValuesPublic()); } catch (e) { next(e); }
};
export const addTaxConfig = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.createTaxConfig(req.body)); } catch (e) { next(e); }
};
export const editTaxConfig = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateTaxConfig(req.params.id, req.body)); } catch (e) { next(e); }
};
export const removeTaxConfig = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteTaxConfig(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

// ─── Platform Variables ───────────────────────────────────────────────────────
export const listPlatformVariables = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getPlatformVariables()); } catch (e) { next(e); }
};
export const setPlatformVar = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.setPlatformVariable(req.body.key, req.body.value, req.body.description)); } catch (e) { next(e); }
};

// ─── Vendor Plans ─────────────────────────────────────────────────────────────
export const listVendorPlans = async (_: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getVendorPlans()); } catch (e) { next(e); }
};
export const addVendorPlan = async (req: Request, res: Response, next: NextFunction) => {
  try { sendCreated(res, await svc.createVendorPlan(req.body)); } catch (e) { next(e); }
};
export const editVendorPlan = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.updateVendorPlan(req.params.id, req.body)); } catch (e) { next(e); }
};
export const removeVendorPlan = async (req: Request, res: Response, next: NextFunction) => {
  try { await svc.deleteVendorPlan(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
};

// ─── Google Maps ──────────────────────────────────────────────────────────────
export const geocodeAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await geocode(req.query.address as string);
    sendSuccess(res, result);
  } catch (e) { next(e); }
};

export const reverseGeocodeCoords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const result = await reverseGeocode(lat, lng);
    sendSuccess(res, { address: result });
  } catch (e) { next(e); }
};

export const placeAutocomplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await getPlaceAutocomplete(req.query.input as string, req.query.session as string);
    sendSuccess(res, results);
  } catch (e) { next(e); }
};
