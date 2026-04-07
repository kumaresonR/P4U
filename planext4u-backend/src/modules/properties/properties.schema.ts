import { z } from 'zod';

export const createPropertySchema = z.object({
  title: z.string().min(5).max(300),
  description: z.string().optional(),
  property_type: z.enum(['apartment', 'house', 'villa', 'plot', 'commercial', 'pg']),
  transaction_type: z.enum(['buy', 'sell', 'rent', 'lease']),
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
  city_id: z.string().uuid().optional(),
  area_id: z.string().uuid().optional(),
  locality: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  images: z.array(z.string().url()).default([]),
  video_url: z.string().url().optional(),
  amenities: z.array(z.string()).default([]),
});

export const updatePropertySchema = createPropertySchema.partial();

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
  start_date: z.string().datetime(),
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
