import { prisma } from '../config/database';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function collectCategoryTreeIds(rootId: string, kind: 'product' | 'service'): Promise<string[]> {
  const out: string[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const children =
      kind === 'product'
        ? await prisma.category.findMany({
            where: { parent_id: id, status: 'active' },
            select: { id: true },
          })
        : await prisma.serviceCategory.findMany({
            where: { parent_id: id, status: 'active' },
            select: { id: true },
          });
    for (const c of children) {
      out.push(c.id);
      queue.push(c.id);
    }
  }
  return out;
}

/** Resolve `category` query (display name or id) to all matching category_id values including descendants. */
export async function resolveProductCategoryIds(raw: string): Promise<string[]> {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const byId = await prisma.category.findFirst({
    where: { id: trimmed, status: 'active' },
    select: { id: true },
  });
  if (byId) return collectCategoryTreeIds(byId.id, 'product');

  if (UUID_RE.test(trimmed)) {
    return [];
  }

  const matches = await prisma.category.findMany({
    where: { name: { equals: trimmed, mode: 'insensitive' }, status: 'active' },
    select: { id: true },
  });
  const set = new Set<string>();
  for (const m of matches) {
    for (const id of await collectCategoryTreeIds(m.id, 'product')) set.add(id);
  }
  return [...set];
}

export async function resolveServiceCategoryIds(raw: string): Promise<string[]> {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const byId = await prisma.serviceCategory.findFirst({
    where: { id: trimmed, status: 'active' },
    select: { id: true },
  });
  if (byId) return collectCategoryTreeIds(byId.id, 'service');

  if (UUID_RE.test(trimmed)) {
    return [];
  }

  const matches = await prisma.serviceCategory.findMany({
    where: { name: { equals: trimmed, mode: 'insensitive' }, status: 'active' },
    select: { id: true },
  });
  const set = new Set<string>();
  for (const m of matches) {
    for (const id of await collectCategoryTreeIds(m.id, 'service')) set.add(id);
  }
  return [...set];
}

export function normalizeBrowseSort(sort: string | undefined): string {
  const s = (sort || 'newest').trim();
  if (s === 'price_low') return 'price_asc';
  if (s === 'price_high') return 'price_desc';
  return s;
}
