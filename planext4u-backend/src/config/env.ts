import { z } from 'zod';
import dotenv from 'dotenv';

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

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Loyalty
  WELCOME_BONUS_POINTS: z.string().default('200'),
  REFERRAL_BONUS_POINTS: z.string().default('100'),
  ORDER_REWARD_PERCENTAGE: z.string().default('2'),
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
  CORS_ORIGINS: parsed.data.FRONTEND_URLS.split(',').map((u) => u.trim()),
  IS_PROD: parsed.data.NODE_ENV === 'production',
  IS_DEV: parsed.data.NODE_ENV === 'development',
};
