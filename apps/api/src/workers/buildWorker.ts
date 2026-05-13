import { Worker, Job } from 'bullmq';
import { connection } from '../queues';
import { BuildService } from '../services/buildService';
import config from '../config';
import logger from '../config/logger';

let buildWorker: any;

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const hasRedis = !!config.REDIS_URL || !isProduction;

if (hasRedis) {
  buildWorker = new Worker(
    'build',
    async (job: Job) => {
      logger.info(`Processing build job ${job.id} for deployment ${job.data.deploymentId}`);
      await BuildService.runBuild(job.data.deploymentId);
    },
    { connection }
  );

  buildWorker.on('completed', (job: Job) => {
    logger.info(`Build job ${job.id} completed`);
  });

  buildWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`Build job ${job?.id} failed: ${err.message}`);
  });
} else {
  logger.warn('🛠️ BuildWorker disabled (No Redis)');
}

export default buildWorker;
