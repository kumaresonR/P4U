import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { sendPushToTokens, sendPushToToken } from '../services/firebase';
import { logger } from '../utils/logger';

export const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export interface NotificationJob {
  tokens: string[];
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export const queuePushNotification = (data: NotificationJob) =>
  notificationQueue.add('send-push', data);

export const startNotificationWorker = () => {
  const worker = new Worker<NotificationJob>(
    'notifications',
    async (job: Job<NotificationJob>) => {
      const { tokens, title, body, imageUrl, data } = job.data;
      await sendPushToTokens(tokens, { title, body, imageUrl, data });
    },
    { connection: redis, concurrency: 10 }
  );

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Push notification sent'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Push notification failed'));

  logger.info('Notification worker started');
  return worker;
};
