import { redis } from '../config/redis';
import { OTP } from '../config/constants';

const otpKey = (mobile: string) => `otp:${mobile}`;
const attemptsKey = (mobile: string) => `otp_attempts:${mobile}`;

export const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const saveOtp = async (mobile: string, otp: string): Promise<void> => {
  await redis.setex(otpKey(mobile), OTP.EXPIRES_MINUTES * 60, otp);
  await redis.del(attemptsKey(mobile));
};

export const verifyOtp = async (mobile: string, otp: string): Promise<boolean> => {
  const attempts = parseInt((await redis.get(attemptsKey(mobile))) || '0', 10);
  if (attempts >= OTP.MAX_ATTEMPTS) return false;

  const stored = await redis.get(otpKey(mobile));
  if (!stored || stored !== otp) {
    await redis.incr(attemptsKey(mobile));
    await redis.expire(attemptsKey(mobile), OTP.EXPIRES_MINUTES * 60);
    return false;
  }

  await redis.del(otpKey(mobile));
  await redis.del(attemptsKey(mobile));
  return true;
};

export const deleteOtp = async (mobile: string): Promise<void> => {
  await redis.del(otpKey(mobile));
};
