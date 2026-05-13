import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config';
import logger from '../config/logger';

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Only default to localhost in development
const redisUrl = config.REDIS_URL || (isProduction ? null : 'redis://localhost:6379');

if (isProduction && !config.REDIS_URL) {
  logger.warn('⚠️ REDIS_URL is not defined. Background tasks will be disabled to avoid connection errors.');
}

// Instantiate connection with lazyConnect if no URL is provided to prevent immediate connection attempts
const connection = new IORedis(redisUrl as any, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  lazyConnect: !redisUrl, // Don't even try to connect if we don't have a URL
  tls: config.REDIS_URL?.startsWith('rediss://') ? {
    rejectUnauthorized: false
  } : undefined,
  retryStrategy: (times) => {
    // If no URL, stop retrying immediately in production
    if (!redisUrl && isProduction) return null;
    // Otherwise, use a very conservative retry strategy
    return Math.min(times * 2000, 60000); 
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) return true;
    return false;
  }
});

let lastWarnTime = 0;
connection.on('error', (err) => {
  // Only log if we actually have a URL or if it's development
  if (redisUrl || !isProduction) {
    const now = Date.now();
    if (now - lastWarnTime > 300000) { // Log once every 5 minutes
      logger.warn('📡 Redis connection failed. Background features will be limited.');
      lastWarnTime = now;
    }
  }
});

export const buildQueue = new Queue('build', { connection });
export const deployQueue = new Queue('deploy', { connection });
export const sslQueue = new Queue('ssl', { connection });
export const notifyQueue = new Queue('notify', { connection });

logger.info('🐎 BullMQ Queues initialized' + (!redisUrl ? ' (Offline Mode)' : ''));

export { connection };
