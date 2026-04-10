import { prisma } from '../config/database';

/**
 * Convert empty strings on the given fields to null.
 * Useful for optional FK / unique fields where '' would either
 * fail FK lookups or collide on unique constraints.
 */
export function nullifyEmptyStrings<T extends Record<string, any>>(data: T, fields: string[]): T {
  const out = { ...data } as any;
  for (const f of fields) {
    if (out[f] === '') out[f] = null;
  }
  return out;
}

/**
 * Validate that the given foreign-key IDs exist in their respective tables.
 * If a referenced row does not exist, the FK is silently set to null
 * (instead of crashing on Prisma's P2003 error).
 *
 * Pass a map of { fieldName: 'modelName' }.
 *
 * Example:
 *   await validateFks(data, { city_id: 'city', area_id: 'area', plan_id: 'vendorPlan' });
 */
export async function validateFks<T extends Record<string, any>>(
  data: T,
  fkMap: Record<string, string>,
): Promise<T> {
  const out = { ...data } as any;
  for (const [field, model] of Object.entries(fkMap)) {
    if (out[field]) {
      const exists = await (prisma as any)[model].findUnique({ where: { id: out[field] } });
      if (!exists) out[field] = null;
    }
  }
  return out;
}

/**
 * Pick only the fields listed from the input object. Anything not in the
 * whitelist is dropped — protects Prisma create/update from "Unknown argument"
 * errors when frontend sends stale fields that no longer exist in the schema.
 */
export function pick<T extends Record<string, any>>(data: T, fields: string[]): Partial<T> {
  const out: any = {};
  for (const f of fields) {
    if (data[f] !== undefined) out[f] = data[f];
  }
  return out;
}
