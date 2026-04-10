import { z } from 'zod';

const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();

export const registerVendorSchema = z.object({
  name: z.string().min(2),
  business_name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  password: z.string().min(6).optional(),
  category_id: z.string().optional(),
  plan_id: z.string().optional(),
  city_id: z.string().optional(),
  area_id: z.string().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
  avatar: optionalUrl,
  shop_photo_url: optionalUrl,
}).passthrough();

export const updateVendorSchema = z.object({
  name: z.string().min(2).optional(),
  business_name: z.string().min(2).optional(),
  avatar: optionalUrl,
  category_id: z.string().optional(),
  plan_id: z.string().optional(),
  city_id: z.string().optional(),
  area_id: z.string().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
  shop_photo_url: optionalUrl,
}).passthrough();

export const updateVendorStatusSchema = z.object({
  status: z.enum(['pending', 'level1_approved', 'level2_approved', 'verified', 'rejected']),
  rejection_reason: z.string().optional(),
});

export const updateBankSchema = z.object({
  bank_name: z.string().min(2),
  account_number: z.string().min(5),
  ifsc_code: z.string().min(11).max(11),
  upi_id: z.string().optional(),
});
