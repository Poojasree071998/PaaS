import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config';
import logger from '../config/logger';

const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const buildQueue = new Queue('build', { connection });
export const deployQueue = new Queue('deploy', { connection });
export const sslQueue = new Queue('ssl', { connection });
export const notifyQueue = new Queue('notify', { connection });

logger.info('🐎 BullMQ Queues initialized');

export { connection };
