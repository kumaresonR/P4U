import { Router } from 'express';
import * as ctrl from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter';
import {
  verifyFirebaseOtpSchema, emailLoginSchema, emailRegisterSchema,
  vendorLoginSchema, adminLoginSchema, refreshTokenSchema,
  forgotPasswordSchema, resetPasswordSchema, fcmTokenSchema, verifyEmailSchema,
} from './auth.schema';

const router = Router();

// Customer Phone OTP (Firebase-based: client sends OTP, gets firebase_token, sends here)
router.post('/otp/verify', otpLimiter, validate(verifyFirebaseOtpSchema), ctrl.verifyFirebaseOtp);

// Customer email/password
router.post('/customer/register', authLimiter, validate(emailRegisterSchema), ctrl.customerRegister);
router.post('/customer/login',    authLimiter, validate(emailLoginSchema),    ctrl.customerLogin);

// Vendor login
router.post('/vendor/login', authLimiter, validate(vendorLoginSchema), ctrl.vendorLogin);

// Admin login
router.post('/admin/login', authLimiter, validate(adminLoginSchema), ctrl.adminLogin);

// Token management
router.post('/refresh', validate(refreshTokenSchema), ctrl.refresh);
router.post('/logout',  authenticate, ctrl.logoutHandler);

// Password reset
router.post('/forgot-password', validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),  ctrl.resetPassword);

// FCM token
router.post('/fcm-token', authenticate, validate(fcmTokenSchema), ctrl.registerFcmToken);

// Email verification
router.post('/verify-email',        validate(verifyEmailSchema), ctrl.verifyEmail);
router.post('/resend-verification', authenticate, ctrl.resendVerificationEmail);

export default router;
