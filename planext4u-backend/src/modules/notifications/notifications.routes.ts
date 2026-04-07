import { Router } from 'express';
import * as ctrl from './notifications.controller';
import { authenticate } from '../../middleware/auth';
import { isAdmin } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { broadcastSchema, sendToUserSchema } from './notifications.schema';

const router = Router();

router.get('/',                 authenticate, ctrl.getMyNotifications);
router.get('/unread',           authenticate, ctrl.unreadCount);
router.put('/:id/read',         authenticate, ctrl.markRead);
router.put('/read-all',         authenticate, ctrl.markAllRead);

// Frontend-compatible aliases
router.get('/me',               authenticate, ctrl.getMyNotifications);
router.post('/me/:id/read',     authenticate, ctrl.markRead);
router.post('/devices/register', authenticate, ctrl.registerDevice);

// Admin
router.post('/broadcast', authenticate, isAdmin, validate(broadcastSchema), ctrl.sendBroadcast);
router.post('/send',      authenticate, isAdmin, validate(sendToUserSchema), ctrl.sendToUser);

export default router;
