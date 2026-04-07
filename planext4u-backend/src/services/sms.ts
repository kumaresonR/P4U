import twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let twilioClient: ReturnType<typeof twilio> | null = null;

const getClient = () => {
  if (!twilioClient) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      return null;
    }
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

export const sendSms = async (to: string, body: string): Promise<void> => {
  const client = getClient();
  if (!client) {
    logger.warn('Twilio not configured — skipping SMS');
    return;
  }
  try {
    await client.messages.create({ from: env.TWILIO_PHONE_NUMBER, to, body });
  } catch (err) {
    logger.error({ err }, 'SMS send failed');
  }
};

export const sendOtpSms = (mobile: string, otp: string) =>
  sendSms(mobile, `Your Planext4U OTP is ${otp}. Valid for 10 minutes. Do not share.`);
