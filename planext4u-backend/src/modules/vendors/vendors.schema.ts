import { z } from 'zod';

export const registerVendorSchema = z.object({
  name: z.string().min(2),
  business_name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  password: z.string().min(6),
  category_id: z.string().uuid().optional(),
  city_id: z.string().uuid().optional(),
  area_id: z.string().uuid().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(2).optional(),
  business_name: z.string().min(2).optional(),
  avatar: z.string().url().optional(),
  category_id: z.string().uuid().optional(),
  city_id: z.string().uuid().optional(),
  area_id: z.string().uuid().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
});

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
