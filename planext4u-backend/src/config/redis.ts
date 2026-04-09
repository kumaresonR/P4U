import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// BullMQ requires maxRetriesPerRequest: null
export const bullConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));
bullConnection.on('error', (err) => console.error('BullMQ Redis error:', err));

export async function connectRedis() {
  if (redis.status === 'ready' || redis.status === 'connecting') return;
  await redis.connect();
}
