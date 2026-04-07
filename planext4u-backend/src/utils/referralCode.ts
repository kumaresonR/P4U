import { prisma } from '../config/database';

export const generateReferralCode = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let exists = true;

  do {
    code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const found = await prisma.customer.findUnique({ where: { referral_code: code } });
    exists = !!found;
  } while (exists);

  return code;
};
