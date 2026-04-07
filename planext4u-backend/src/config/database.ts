import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.IS_DEV ? ['query', 'error', 'warn'] : ['error'],
  });

if (!env.IS_PROD) globalForPrisma.prisma = prisma;

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
}
