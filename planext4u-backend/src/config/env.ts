import { z } from 'zod';
import dotenv from 'dotenv';
import { DEFAULT_B2_BUCKET, DEFAULT_B2_REGION, DEFAULT_B2_S3_ENDPOINT } from './b2-defaults';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  API_PREFIX: z.string().default('/api/v1'),
  FRONTEND_URLS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),

  // Email — GoDaddy SMTP
  SMTP_HOST: z.string().default('smtpout.secureserver.net'),
  SMTP_PORT: z.string().default('465'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Planext4U <support@planext4u.com>'),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Firebase — FCM push + Phone OTP verification
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_API_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Backblaze B2 (S3-compatible API) — see https://www.backblaze.com/docs/cloud-storage/s3-compatible-api
  B2_APPLICATION_KEY_ID: z.string().optional(),
  B2_APPLICATION_KEY: z.string().optional(),
  B2_BUCKET: z.string().optional(),
  /** e.g. https://s3.us-west-004.backblazeb2.com (from B2 bucket S3-compatible endpoint) */
  B2_S3_ENDPOINT: z.string().optional(),
  /** Public file base: https://f003.backblazeb2.com/file/your-bucket-name (no trailing slash) */
  B2_PUBLIC_URL_BASE: z.string().optional(),
  /** Must match the S3 endpoint region segment, e.g. us-west-004 — or omit and it is parsed from B2_S3_ENDPOINT */
  B2_REGION: z.string().optional(),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Loyalty
  WELCOME_BONUS_POINTS: z.string().default('200'),
  REFERRAL_BONUS_POINTS: z.string().default('100'),
  ORDER_REWARD_PERCENTAGE: z.string().default('2'),
  /** Points credited to post owner when another user likes their post (0 to disable). */
  SOCIAL_LIKE_RECEIVER_POINTS: z.string().default('1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: parseInt(parsed.data.PORT, 10),
  SMTP_PORT: parseInt(parsed.data.SMTP_PORT, 10),
  WELCOME_BONUS_POINTS: parseInt(parsed.data.WELCOME_BONUS_POINTS, 10),
  REFERRAL_BONUS_POINTS: parseInt(parsed.data.REFERRAL_BONUS_POINTS, 10),
  ORDER_REWARD_PERCENTAGE: parseFloat(parsed.data.ORDER_REWARD_PERCENTAGE),
  SOCIAL_LIKE_RECEIVER_POINTS: Math.max(0, parseInt(parsed.data.SOCIAL_LIKE_RECEIVER_POINTS, 10) || 0),
  CORS_ORIGINS: parsed.data.FRONTEND_URLS.split(',').map((u) => u.trim()),
  IS_PROD: parsed.data.NODE_ENV === 'production',
  IS_DEV: parsed.data.NODE_ENV === 'development',
  // B2: bucket / endpoint / region are safe to default in repo; keys + public URL base stay in .env only
  B2_BUCKET: parsed.data.B2_BUCKET || DEFAULT_B2_BUCKET,
  B2_S3_ENDPOINT: parsed.data.B2_S3_ENDPOINT || DEFAULT_B2_S3_ENDPOINT,
  B2_REGION: parsed.data.B2_REGION || DEFAULT_B2_REGION,
};
