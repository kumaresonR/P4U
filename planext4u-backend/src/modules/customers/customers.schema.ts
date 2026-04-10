import { z } from 'zod';

const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();

export const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  mobile: z.string().min(10).max(15).optional(),
  avatar: optionalUrl,
  profile_photo: optionalUrl,
  city_id: z.string().optional(),
  area_id: z.string().optional(),
  occupation: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  about: z.string().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).passthrough();

export const addAddressSchema = z.object({
  label: z.enum(['home', 'work', 'other']).default('home'),
  address: z.string().min(5),
  city: z.string().min(2),
  area: z.string().min(2),
  pincode: z.string().min(6).max(6),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_default: z.boolean().default(false),
});

export const bulkCustomerSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const bulkCustomerStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: z.enum(['active', 'inactive', 'suspended']),
});

export const submitKycSchema = z.object({
  document_type: z.enum(['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id']).default('aadhaar'),
  document_number: z.string().min(4).max(20),
  front_image_url: z.string().url(),
  back_image_url: z.string().url().optional(),
});

export const updateKycDocSchema = submitKycSchema.partial();

export const savedSearchNotifySchema = z.object({
  notify: z.boolean(),
});
