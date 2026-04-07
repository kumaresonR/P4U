import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/database';
import { connectRedis, redis } from './config/redis';
import { initFirebase } from './services/firebase';
import { initSocket } from './socket';
import { startEmailWorker } from './workers/emailWorker';
import { startNotificationWorker } from './workers/notificationWorker';
import { logger } from './utils/logger';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGINS,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

initSocket(io);

const start = async () => {
  try {
    await connectDB();
    await connectRedis();
    initFirebase();
    startEmailWorker();
    startNotificationWorker();

    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`API: http://localhost:${env.PORT}${env.API_PREFIX}`);
    });
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  httpServer.close(async () => {
    await disconnectDB();
    await redis.quit();
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});

start();
