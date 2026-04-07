import { z } from 'zod';

export const uploadQuerySchema = z.object({
  folder: z.string().max(100).optional(),
});
