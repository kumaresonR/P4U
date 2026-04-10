import { z } from 'zod';

const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();

export const createPropertySchema = z.object({
  title: z.string().min(5).max(300),
  description: z.string().optional(),
  property_type: z.enum(['apartment', 'house', 'villa', 'plot', 'commercial', 'pg']),
  transaction_type: z.enum(['buy', 'sell', 'rent', 'lease']),
  status: z.enum(['pending', 'draft', 'submitted', 'active']).optional(),
  price: z.number().positive(),
  area_sqft: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  floors: z.number().int().optional(),
  floor_number: z.number().int().optional(),
  total_floors: z.number().int().optional(),
  furnishing: z.enum(['unfurnished', 'semi-furnished', 'furnished']).optional(),
  facing: z.string().optional(),
  age_years: z.number().int().min(0).optional(),
  city_id: z.string().optional(),
  area_id: z.string().optional(),
  locality_id: z.string().optional(),
  locality: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  images: z.array(z.string()).default([]),
  video_url: optionalUrl,
  amenities: z.array(z.string()).default([]),
}).passthrough();

export const updatePropertySchema = createPropertySchema.partial().extend({
  is_featured: z.boolean().optional(),
});

export const emiCalculatorSchema = z.object({
  principal: z.number().positive(),
  rate: z.number().positive(),
  tenure: z.number().int().positive(),
});

export const savedSearchSchema = z.object({
  name: z.string().min(1),
  filters: z.record(z.unknown()),
});

export const propertyMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});

export const rentTrackerSchema = z.object({
  property_name: z.string().min(2),
  landlord_name: z.string().optional(),
  landlord_contact: z.string().optional(),
  monthly_rent: z.number().positive(),
  due_date: z.number().int().min(1).max(28),
  address: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const rentPaymentSchema = z.object({
  amount: z.number().positive(),
  paid_date: z.string().datetime(),
  for_month: z.string().datetime(),
  receipt_url: z.string().url().optional(),
  notes: z.string().optional(),
});

/** Replace paid_months JSON (e.g. list of "Jan 2026" strings from the rent tracker UI) */
export const rentPaidMonthsUpdateSchema = z.object({
  paid_months: z.array(z.any()),
});

export const propertyEnquirySchema = z.object({
  message: z.string().max(1000).optional(),
});

export const propertyVisitSchema = z.object({
  scheduled_at: z.string().datetime(),
  notes: z.string().optional(),
});

export const propertyReportSchema = z.object({
  reason: z.string().min(2).max(200),
  description: z.string().optional(),
});

export const propertyStatusBodySchema = z.object({
  status: z.string().min(2).max(50),
});

export const propertyReportStatusSchema = z.object({
  status: z.string().min(2).max(50),
});

export const propertyLocalitySchema = z.object({
  name: z.string().min(1).max(200),
  city_id: z.string().optional().nullable(),
  area_id: z.string().optional().nullable(),
  status: z.string().max(50).optional(),
});

export const propertyAmenityAdminSchema = z.object({
  name: z.string().min(1).max(200),
  icon: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const propertyFilterOptionAdminSchema = z.object({
  filter_key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const propertyPlanAdminSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  duration_days: z.number().int().positive().optional(),
  features: z.record(z.unknown()).optional().nullable(),
  is_active: z.boolean().optional(),
});
