import { z } from 'zod';

// Firebase phone auth: client sends OTP via Firebase SDK → gets firebase_token → sends to backend
export const verifyFirebaseOtpSchema = z.object({
  firebase_token: z.string().min(10),  // Firebase ID token after phone verification
  name: z.string().min(2).optional(),
  referral_code: z.string().optional(),
});

export const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const emailRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  password: z.string().min(6),
  referral_code: z.string().optional(),
});

export const vendorLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

export const fcmTokenSchema = z.object({
  token: z.string(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});
