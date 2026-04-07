import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!env.SMTP_USER) {
    logger.warn('SMTP not configured — skipping email');
    return;
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, ...options });
  } catch (err) {
    logger.error({ err }, 'Email send failed');
  }
};

// ─── Templates ──────────────────────────────────────────────────────────────

export const sendOtpEmail = (to: string, otp: string) =>
  sendEmail({
    to,
    subject: 'Your OTP — Planext4U',
    html: `<h2>Your OTP is <strong>${otp}</strong></h2><p>Valid for 10 minutes. Do not share it.</p>`,
  });

export const sendOrderConfirmation = (to: string, orderId: string, total: number) =>
  sendEmail({
    to,
    subject: `Order Confirmed — #${orderId}`,
    html: `<h2>Order Confirmed!</h2><p>Order ID: <strong>${orderId}</strong></p><p>Total: ₹${total}</p>`,
  });

export const sendPasswordReset = (to: string, resetUrl: string) =>
  sendEmail({
    to,
    subject: 'Reset Your Password — Planext4U',
    html: `<h2>Password Reset</h2><p><a href="${resetUrl}">Click here to reset your password</a>. Link expires in 1 hour.</p>`,
  });

export const sendVendorApproval = (to: string, vendorName: string) =>
  sendEmail({
    to,
    subject: 'Your vendor account is approved!',
    html: `<h2>Welcome, ${vendorName}!</h2><p>Your vendor account on Planext4U has been approved. You can now start adding products.</p>`,
  });
