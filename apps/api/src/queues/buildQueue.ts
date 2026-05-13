import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { io, prisma } from '../index';

const redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const buildQueue = new Queue('build-queue', { connection });

export const buildWorker = new Worker(
  'build-queue',
  async (job: Job) => {
    const { deploymentId, projectId, repoUrl, framework } = job.data;
    
    console.log(`Starting build for deployment: ${deploymentId}`);
    
    try {
      // 1. Update status to BUILDING
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'BUILDING' },
      });

      // 2. Simulate build stages
      const stages = ['Clone', 'Install', 'Build', 'Deploy', 'Health Check'];
      
      for (const stage of stages) {
        await job.updateProgress(stages.indexOf(stage) * 20);
        
        // Log to DB
        const log = await prisma.buildLog.create({
          data: {
            deploymentId,
            message: `Starting stage: ${stage}...`,
            level: 'INFO',
          },
        });

        // Stream via Socket.io
        io.to(`deployment:${deploymentId}`).emit('log', log);
        
        // Simulate work
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const successLog = await prisma.buildLog.create({
          data: {
            deploymentId,
            message: `Completed stage: ${stage} successfully.`,
            level: 'INFO',
          },
        });
        io.to(`deployment:${deploymentId}`).emit('log', successLog);
      }

      // 3. Update status to READY
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          status: 'READY',
          url: `https://${projectId.substring(0, 8)}.deployflow.app` 
        },
      });

      console.log(`Build completed for deployment: ${deploymentId}`);
    } catch (error: any) {
      console.error(`Build failed for deployment: ${deploymentId}`, error);
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'ERROR' },
      });

      const errorLog = await prisma.buildLog.create({
        data: {
          deploymentId,
          message: `Build failed: ${error.message}`,
          level: 'ERROR',
        },
      });
      io.to(`deployment:${deploymentId}`).emit('log', errorLog);
    }
  },
  { connection }
);
