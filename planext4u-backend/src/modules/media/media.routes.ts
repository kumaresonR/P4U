import { Router } from 'express';
import * as ctrl from './media.controller';
import { authenticate } from '../../middleware/auth';
import { uploadImage, uploadAny } from '../../middleware/upload';

const router = Router();

router.post('/image',    authenticate, uploadImage.single('image'),    ctrl.uploadSingleImage);
router.post('/images',   authenticate, uploadImage.array('images', 10), ctrl.uploadMultipleImages);
router.post('/document', authenticate, uploadAny.single('document'),  ctrl.uploadDocument);
router.get('/library',   authenticate, ctrl.getMediaLibrary);
router.delete('/:id',    authenticate, ctrl.deleteMedia);

export default router;
