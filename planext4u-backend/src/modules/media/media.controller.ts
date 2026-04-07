import { Request, Response, NextFunction } from 'express';
import * as svc from './media.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types';

export const uploadSingleImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file provided', 400);
    const folder = (req.query.folder as string) || 'uploads';
    const url = await svc.uploadSingleImage(req.file.buffer, req.file.mimetype, folder);
    sendCreated(res, { url }, 'Image uploaded');
  } catch (e) { next(e); }
};

export const uploadMultipleImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw new AppError('No files provided', 400);
    const folder = (req.query.folder as string) || 'uploads';
    const urls = await svc.uploadMultipleImages(files, folder);
    sendCreated(res, { urls }, 'Images uploaded');
  } catch (e) { next(e); }
};

export const uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file provided', 400);
    const vendorId = req.user?.role === 'vendor' ? req.user.id : undefined;
    const serviceVendorId = req.user?.role === 'service_vendor' ? req.user.id : undefined;
    const { url } = await svc.uploadDocument(req.file, vendorId, serviceVendorId);
    sendCreated(res, { url }, 'Document uploaded');
  } catch (e) { next(e); }
};

export const getMediaLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const media = await svc.getMediaLibrary(req.user!.id, req.user!.role);
    sendSuccess(res, media);
  } catch (e) { next(e); }
};

export const deleteMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.removeMedia(req.params.id);
    sendSuccess(res, null, 'Deleted');
  } catch (e) { next(e); }
};
