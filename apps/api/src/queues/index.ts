import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config';
import logger from '../config/logger';

// Handle missing Redis connection gracefully
const redisUrl: string = config.REDIS_URL || 'redis://localhost:6379';
if (!config.REDIS_URL) {
  logger.warn('⚠️ REDIS_URL is not defined. Background workers will not function correctly.');
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  tls: config.REDIS_URL?.startsWith('rediss://') ? {
    rejectUnauthorized: false
  } : undefined,
  retryStrategy: (times) => {
    // Stop retrying after 10 failed attempts if no URL was provided (likely misconfigured)
    if (!config.REDIS_URL && times > 10) return null;
    return Math.min(times * 1000, 30000); // Wait up to 30s between retries
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) return true;
    return false;
  }
});

let lastWarnTime = 0;
connection.on('error', (err) => {
  const now = Date.now();
  if (now - lastWarnTime > 60000) { // Only log once per minute
    logger.warn('📡 Redis connection failed. Background features will be limited.');
    lastWarnTime = now;
  }
});

export const buildQueue = new Queue('build', { connection });
export const deployQueue = new Queue('deploy', { connection });
export const sslQueue = new Queue('ssl', { connection });
export const notifyQueue = new Queue('notify', { connection });

logger.info('🐎 BullMQ Queues initialized');

export { connection };
