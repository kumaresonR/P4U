import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const checkOtpAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobile } = req.body;
    const portal = (req.query.portal as string) || 'customer';
    const result = await authService.checkOtpAccountExists(mobile, portal);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const verifyFirebaseOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firebase_token, name, referral_code } = req.body;
    const portal = (req.query.portal as string) || 'customer';
    const result = await authService.verifyFirebaseOtp(firebase_token, name, referral_code, portal);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

export const customerRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.registerCustomer(req.body);
    sendCreated(res, result, 'Registration successful');
  } catch (err) { next(err); }
};

export const customerLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginCustomer(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

export const vendorLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const type = (req.query.type as 'vendor' | 'service_vendor') || 'vendor';
    const result = await authService.loginVendor(email, password, type);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginAdmin(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokens = await authService.refreshTokens(req.body.refresh_token);
    sendSuccess(res, tokens, 'Token refreshed');
  } catch (err) { next(err); }
};

export const logoutHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    await authService.logout(token, req.body.refresh_token);
    sendSuccess(res, null, 'Logged out');
  } catch (err) { next(err); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    sendSuccess(res, null, 'If this email exists, a reset link has been sent');
  } catch (err) { next(err); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, null, 'Password reset successful');
  } catch (err) { next(err); }
};

export const registerFcmToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await authService.registerFcmToken(req.user!.id, req.user!.role, req.body.token);
    sendSuccess(res, null, 'FCM token registered');
  } catch (err) { next(err); }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.verifyEmail(req.body.token);
    sendSuccess(res, result, 'Email verified');
  } catch (err) { next(err); }
};

export const resendVerificationEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await authService.resendVerificationEmail(req.user!.id);
    sendSuccess(res, null, 'Verification email sent');
  } catch (err) { next(err); }
};
