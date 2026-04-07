import multer from 'multer';
import path from 'path';
import { UPLOAD } from '../config/constants';

const storage = multer.memoryStorage();

const fileFilter = (allowedTypes: string[]) =>
  (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
    }
  };

export const uploadImage = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_IMAGE_SIZE },
  fileFilter: fileFilter(UPLOAD.ALLOWED_IMAGE_TYPES),
});

export const uploadVideo = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_VIDEO_SIZE },
  fileFilter: fileFilter(UPLOAD.ALLOWED_VIDEO_TYPES),
});

export const uploadAny = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_VIDEO_SIZE },
});
