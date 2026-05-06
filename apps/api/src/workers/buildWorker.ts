import { Worker, Job } from 'bullmq';
import { connection } from '../queues';
import { BuildService } from '../services/buildService';
import logger from '../config/logger';

const buildWorker = new Worker(
  'build',
  async (job: Job) => {
    logger.info(`Processing build job ${job.id} for deployment ${job.data.deploymentId}`);
    await BuildService.runBuild(job.data.deploymentId);
  },
  { connection }
);

buildWorker.on('completed', (job) => {
  logger.info(`Build job ${job.id} completed`);
});

buildWorker.on('failed', (job, err) => {
  logger.error(`Build job ${job.id} failed: ${err.message}`);
});

export default buildWorker;
