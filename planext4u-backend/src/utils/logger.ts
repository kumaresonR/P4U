import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.IS_PROD ? 'info' : 'debug',
  transport: env.IS_DEV
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
});
