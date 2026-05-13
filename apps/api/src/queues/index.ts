import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config';
import logger from '../config/logger';

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const redisUrl = config.REDIS_URL;

// Stub for Queue when Redis is missing
class QueueStub {
  constructor(public name: string) {}
  async add() { logger.warn(`Queue.${this.name}.add called but Redis is offline.`); return null; }
  async getJob() { return null; }
  on() { return this; }
}

let connection: any;
let buildQueue: any;
let deployQueue: any;
let sslQueue: any;
let notifyQueue: any;

if (isProduction && !redisUrl) {
  logger.warn('⚠️ REDIS_URL is missing. Background tasks are DISABLED.');
  // Use stubs to prevent crashes
  connection = { on: () => {}, quit: async () => {} };
  buildQueue = new QueueStub('build');
  deployQueue = new QueueStub('deploy');
  sslQueue = new QueueStub('ssl');
  notifyQueue = new QueueStub('notify');
} else {
  // Only connect if we have a URL or we are in development
  const finalUrl = redisUrl || 'redis://localhost:6379';
  
  connection = new IORedis(finalUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    tls: finalUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    retryStrategy: (times) => {
      if (times > 3 && !redisUrl) return null; // Give up quickly if no URL provided
      return Math.min(times * 1000, 15000);
    }
  });

  // Catch errors immediately to prevent process crashes
  connection.on('error', () => {}); 

  buildQueue = new Queue('build', { connection });
  deployQueue = new Queue('deploy', { connection });
  sslQueue = new Queue('ssl', { connection });
  notifyQueue = new Queue('notify', { connection });

  logger.info(`🐎 BullMQ Queues initialized (${redisUrl ? 'Connected' : 'Dev Mode'})`);
}

export { connection, buildQueue, deployQueue, sslQueue, notifyQueue };
