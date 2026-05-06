import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { buildQueue } from '../queues';
import prisma from '../config/prisma';
import logger from '../config/logger';
import docker from '../utils/docker';
import { DeploymentStatus, LogLevel } from '@prisma/client';

export class BuildService {
  static async triggerBuild(projectId: string, userId: string, branch: string = 'main') {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        teamId: project.teamId,
        userId,
        branch,
        status: DeploymentStatus.QUEUED,
      },
    });

    await buildQueue.add('build-job', {
      deploymentId: deployment.id,
      projectId: project.id,
      repoUrl: project.repoUrl,
      branch,
    });

    return deployment;
  }

  static async runBuild(deploymentId: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });

    if (!deployment) return;

    const buildDir = path.join(process.cwd(), 'temp-builds', deploymentId);
    
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.BUILDING },
      });

      await this.log(deploymentId, '🚀 Starting build process...', LogLevel.INFO);

      // 1. Clone repo
      await fs.mkdir(buildDir, { recursive: true });
      const git = simpleGit(buildDir);
      await this.log(deploymentId, `Cloning repository: ${deployment.project.repoUrl} branch: ${deployment.branch}`, LogLevel.INFO);
      await git.clone(deployment.project.repoUrl, '.', ['--branch', deployment.branch]);

      // 2. Build via Docker
      await this.log(deploymentId, 'Building Docker image...', LogLevel.INFO);
      
      // In a real scenario, we'd use a specific Dockerfile based on framework
      // For this demo, we simulate the build steps
      await this.log(deploymentId, 'Installing dependencies...', LogLevel.INFO);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
      
      await this.log(deploymentId, 'Running build command...', LogLevel.INFO);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate work

      // 3. Success
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: DeploymentStatus.READY,
          readyAt: new Date(),
          url: `https://${deployment.project.slug}-${deploymentId.substring(0, 6)}.deployflow.app`,
        },
      });

      await this.log(deploymentId, '✅ Build completed successfully!', LogLevel.INFO);
    } catch (error: any) {
      logger.error(`Build failed for ${deploymentId}:`, error);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.ERROR, errorMessage: error.message },
      });
      await this.log(deploymentId, `❌ Build failed: ${error.message}`, LogLevel.ERROR);
    } finally {
      // Cleanup build dir
      // await fs.rm(buildDir, { recursive: true, force: true });
    }
  }

  static async log(deploymentId: string, message: string, level: LogLevel) {
    await prisma.buildLog.create({
      data: {
        deploymentId,
        message,
        level,
      },
    });
    // Emit via Socket.io (would need access to io instance)
    // io.to(`deployment:${deploymentId}`).emit('build:log', { message, level, timestamp: new Date() });
  }
}
