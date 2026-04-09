import { Queue, Worker, Job } from 'bullmq';
import { bullConnection } from '../config/redis';
import { sendEmail } from '../services/email';
import { logger } from '../utils/logger';

// ─── Queue ────────────────────────────────────────────────────────────────────

export const emailQueue = new Queue('email', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// ─── Job Types ────────────────────────────────────────────────────────────────

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
}

export const queueEmail = (data: EmailJob) =>
  emailQueue.add('send-email', data);

// ─── Worker ───────────────────────────────────────────────────────────────────

export const startEmailWorker = () => {
  const worker = new Worker<EmailJob>(
    'email',
    async (job: Job<EmailJob>) => {
      const { to, subject, html } = job.data;
      logger.info({ to, subject }, `Processing email job ${job.id}`);
      await sendEmail({ to, subject, html });
    },
    { connection: bullConnection, concurrency: 5 }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Email job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed');
  });

  logger.info('Email worker started');
  return worker;
};
