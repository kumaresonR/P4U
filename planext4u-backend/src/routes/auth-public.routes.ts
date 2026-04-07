/**
 * /api/auth/public/* routes — expected by the admin web frontend.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response';
import * as authSvc from '../modules/auth/auth.service';

const router = Router();

// POST /api/auth/public/login  (admin login)
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authSvc.loginAdmin(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (e) { next(e); }
});

// POST /api/auth/public/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.refresh_token || req.headers['x-refresh-token'];
    const result = await authSvc.refreshTokens(token as string);
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

export default router;
