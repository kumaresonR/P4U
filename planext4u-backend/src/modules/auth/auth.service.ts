import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt';
import { generateReferralCode } from '../../utils/referralCode';
import { verifyFirebaseToken } from '../../services/firebase';
import { sendPasswordReset, sendEmail } from '../../services/email';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import crypto from 'crypto';

// ─── OTP pre-check: is this phone registered? ────────────────────────────────
// Called by the client BEFORE Firebase sendOTP so unregistered users get a
// "please register first" message instead of a wasted OTP SMS.

export const checkOtpAccountExists = async (mobile: string, portal: string) => {
  const digits = mobile.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const normalized = last10;
  const withPlus = digits.length > 10 ? `+${digits}` : `+91${last10}`;

  if (portal === 'vendor') {
    const vendor = await prisma.vendor.findFirst({
      where: { OR: [{ mobile: normalized }, { mobile: withPlus }, { mobile: digits }] },
      select: { id: true, status: true },
    });
    return { exists: !!vendor, status: vendor?.status ?? null };
  }

  const customer = await prisma.customer.findFirst({
    where: { OR: [{ mobile: normalized }, { mobile: withPlus }, { mobile: digits }] },
    select: { id: true, status: true },
  });
  return { exists: !!customer, status: customer?.status ?? null };
};

// ─── Firebase Phone OTP Auth ──────────────────────────────────────────────────
// The client uses Firebase SDK to:
//  1. Send OTP to phone (handled fully by Firebase on the client)
//  2. Verify OTP → receive a Firebase ID token
//  3. Send that ID token to POST /auth/otp/verify
// Backend verifies the token, extracts phone number, finds/creates customer.

export const verifyFirebaseOtp = async (
  firebaseToken: string,
  name?: string,
  referralCode?: string,
  portal: string = 'customer',
) => {
  const { phone } = await verifyFirebaseToken(firebaseToken);

  // Normalize: strip leading country code for DB storage
  const mobile = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

  // ── Vendor portal OTP login ───────────────────────────────────────────────
  if (portal === 'vendor') {
    const vendor = await prisma.vendor.findFirst({
      where: { OR: [{ mobile }, { mobile: phone }] },
    });
    if (!vendor) throw new AppError('No vendor account found for this phone number. Please register first.', 404);
    if (vendor.status === 'rejected') throw new AppError('Vendor account rejected', 403);
    if (vendor.status === 'suspended') throw new AppError('Vendor account suspended', 403);
    const tokens = generateTokenPair({ id: vendor.id, role: 'vendor', mobile });
    const { password_hash: _, fcm_tokens: __, ...safeVendor } = vendor as any;
    return { vendor: safeVendor, ...tokens };
  }

  // ── Customer portal OTP login (registered-only) ───────────────────────────
  const customer = await prisma.customer.findFirst({
    where: { OR: [{ mobile }, { mobile: phone }] },
  });

  if (!customer) {
    throw new AppError('No account found for this phone number. Please register first.', 404);
  }
  if (customer.status !== 'active') throw new AppError('Account suspended', 403);

  const tokens = generateTokenPair({ id: customer.id, role: 'customer', mobile });
  const { password_hash: _, fcm_tokens: __, ...safeCustomer } = customer as any;
  return { customer: safeCustomer, ...tokens };
};

// ─── Customer Email/Password Auth ────────────────────────────────────────────

export const registerCustomer = async (data: {
  name: string; email: string; mobile: string; password: string; referral_code?: string;
}) => {
  const exists = await prisma.customer.findFirst({
    where: { OR: [{ email: data.email }, { mobile: data.mobile }] },
  });
  if (exists) throw new AppError('Email or mobile already registered', 409);

  let referredBy: string | null = null;
  if (data.referral_code) {
    const referrer = await prisma.customer.findFirst({
      where: { referral_code: data.referral_code },
      select: { id: true },
    });
    if (!referrer) throw new AppError('Invalid referral code', 400);
    referredBy = data.referral_code;
  }

  const refCode = await generateReferralCode();
  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      password_hash: await hashPassword(data.password),
      referral_code: refCode,
      referred_by: referredBy,
      wallet_points: env.WELCOME_BONUS_POINTS,
      email_verified: false,
    },
  });

  await prisma.pointsTransaction.create({
    data: {
      user_id: customer.id,
      type: 'welcome',
      points: env.WELCOME_BONUS_POINTS,
      description: 'Welcome bonus',
    },
  });

  // Send email verification link
  await sendEmailVerificationLink(customer.id, data.email);

  const tokens = generateTokenPair({ id: customer.id, role: 'customer', email: data.email });
  const { password_hash: _, fcm_tokens: __, ...safeCustomer } = customer as any;
  return { customer: safeCustomer, ...tokens };
};

// ─── Email Verification ───────────────────────────────────────────────────────

export const sendEmailVerificationLink = async (customerId: string, email: string) => {
  const token = crypto.randomBytes(32).toString('hex');
  // Store with 24h TTL
  await redis.setex(`email_verify:${token}`, 86400, customerId);

  const verifyUrl = `${env.CORS_ORIGINS[0]}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify Your Email — Planext4U',
    html: `
      <h2>Welcome to Planext4U!</h2>
      <p>Click the button below to verify your email address.</p>
      <a href="${verifyUrl}" style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Verify Email
      </a>
      <p style="margin-top:16px;color:#666;">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    `,
  });
};

export const verifyEmail = async (token: string) => {
  const customerId = await redis.get(`email_verify:${token}`);
  if (!customerId) throw new AppError('Invalid or expired verification link', 400);

  await prisma.customer.update({
    where: { id: customerId },
    data: { email_verified: true },
  });
  await redis.del(`email_verify:${token}`);
  return { message: 'Email verified successfully' };
};

export const resendVerificationEmail = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true, email_verified: true },
  });
  if (!customer) throw new AppError('Customer not found', 404);
  if (customer.email_verified) throw new AppError('Email already verified', 400);
  if (!customer.email) throw new AppError('No email on account', 400);

  await sendEmailVerificationLink(customerId, customer.email);
};

export const loginCustomer = async (email: string, password: string) => {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) throw new AppError('No account found for this email. Please register first.', 404);
  if (!customer.password_hash) throw new AppError('This account uses phone login. Use OTP sign-in instead.', 400);
  if (customer.status !== 'active') throw new AppError('Account suspended', 403);

  const valid = await comparePassword(password, customer.password_hash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const tokens = generateTokenPair({ id: customer.id, role: 'customer', email });
  const { password_hash: _, fcm_tokens: __, ...safeCustomer } = customer as any;
  return { customer: safeCustomer, ...tokens };
};

// ─── Vendor Auth ──────────────────────────────────────────────────────────────

export const loginVendor = async (email: string, password: string, type: 'vendor' | 'service_vendor') => {
  if (type === 'vendor') {
    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (!vendor) throw new AppError('No vendor account found for this email. Please register first.', 404);
    if (!vendor.password_hash) throw new AppError('This account uses phone login. Use OTP sign-in instead.', 400);
    if (vendor.status === 'rejected') throw new AppError('Account rejected', 403);
    const valid = await comparePassword(password, vendor.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);
    const tokens = generateTokenPair({ id: vendor.id, role: 'vendor', email });
    const { password_hash: _, fcm_tokens: __, ...safeVendor } = vendor as any;
    return { vendor: safeVendor, ...tokens };
  } else {
    const vendor = await prisma.serviceVendor.findUnique({ where: { email } });
    if (!vendor) throw new AppError('No service-vendor account found for this email. Please register first.', 404);
    if (!vendor.password_hash) throw new AppError('This account uses phone login. Use OTP sign-in instead.', 400);
    if (vendor.status === 'rejected') throw new AppError('Account rejected', 403);
    const valid = await comparePassword(password, vendor.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);
    const tokens = generateTokenPair({ id: vendor.id, role: 'service_vendor', email });
    const { password_hash: _, fcm_tokens: __, ...safeVendor } = vendor as any;
    return { vendor: safeVendor, ...tokens };
  }
};

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export const loginAdmin = async (email: string, password: string) => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) throw new AppError('No admin account found for this email.', 404);
  if (admin.status !== 'active') throw new AppError('Account disabled', 403);

  const valid = await comparePassword(password, admin.password_hash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const tokens = generateTokenPair({ id: admin.id, role: admin.role, email });
  return { admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }, ...tokens };
};

// ─── Token Refresh ────────────────────────────────────────────────────────────

export const refreshTokens = async (refreshToken: string) => {
  const blacklisted = await redis.get(`blacklist:${refreshToken}`);
  if (blacklisted) throw new AppError('Token revoked', 401);

  try {
    const payload = verifyRefreshToken(refreshToken);
    return generateTokenPair({ id: payload.id, role: payload.role, email: payload.email, mobile: payload.mobile });
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async (accessToken: string, refreshToken?: string) => {
  const ttl = 60 * 60 * 24 * 30;
  await redis.setex(`blacklist:${accessToken}`, ttl, '1');
  if (refreshToken) await redis.setex(`blacklist:${refreshToken}`, ttl, '1');
};

// ─── Password Reset ───────────────────────────────────────────────────────────

export const requestPasswordReset = async (email: string) => {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) return; // silent — don't reveal existence

  const token = crypto.randomBytes(32).toString('hex');
  await redis.setex(`reset:${token}`, 3600, customer.id);

  const resetUrl = `${env.CORS_ORIGINS[0]}/reset-password?token=${token}`;
  await sendPasswordReset(email, resetUrl);
};

export const resetPassword = async (token: string, newPassword: string) => {
  const customerId = await redis.get(`reset:${token}`);
  if (!customerId) throw new AppError('Invalid or expired reset token', 400);

  await prisma.customer.update({
    where: { id: customerId },
    data: { password_hash: await hashPassword(newPassword) },
  });
  await redis.del(`reset:${token}`);
};

// ─── FCM Token ────────────────────────────────────────────────────────────────

export const registerFcmToken = async (userId: string, role: string, fcmToken: string) => {
  if (role === 'customer') {
    const c = await prisma.customer.findUnique({ where: { id: userId }, select: { fcm_tokens: true } });
    if (!c) return;
    const tokens = Array.from(new Set([...(c.fcm_tokens as string[]), fcmToken]));
    await prisma.customer.update({ where: { id: userId }, data: { fcm_tokens: tokens } });
  } else if (role === 'vendor') {
    const v = await prisma.vendor.findUnique({ where: { id: userId }, select: { fcm_tokens: true } });
    if (!v) return;
    const tokens = Array.from(new Set([...(v.fcm_tokens as string[]), fcmToken]));
    await prisma.vendor.update({ where: { id: userId }, data: { fcm_tokens: tokens } });
  } else if (role === 'service_vendor') {
    const sv = await prisma.serviceVendor.findUnique({ where: { id: userId }, select: { fcm_tokens: true } });
    if (!sv) return;
    const tokens = Array.from(new Set([...(sv.fcm_tokens as string[]), fcmToken]));
    await prisma.serviceVendor.update({ where: { id: userId }, data: { fcm_tokens: tokens } });
  }
};
