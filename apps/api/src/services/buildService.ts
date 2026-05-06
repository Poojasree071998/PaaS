import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { buildQueue } from '../queues';
import prisma from '../config/prisma';
import logger from '../config/logger';
import docker from '../utils/docker';
import { DeploymentStatus, LogLevel } from '@prisma/client';

import { io } from '../server';

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
      io.to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.BUILDING);

      await this.log(deploymentId, '🚀 Starting build process...', LogLevel.INFO);

      // 1. Clone repo with timeout and no-prompt config
      await fs.mkdir(buildDir, { recursive: true });
      
      const git = simpleGit({
        baseDir: buildDir,
        binary: 'git',
        maxConcurrentProcesses: 1,
      }).env('GIT_TERMINAL_PROMPT', '0'); // Disable password prompts

      await this.log(deploymentId, `Cloning repository: ${deployment.project.repoUrl} (branch: ${deployment.branch})`, LogLevel.INFO);
      
      try {
        await Promise.race([
          git.clone(deployment.project.repoUrl, '.', ['--branch', deployment.branch, '--depth', '1']),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Git clone timed out after 60s')), 60000))
        ]);
        await this.log(deploymentId, '✅ Repository cloned successfully.', LogLevel.INFO);
      } catch (cloneError: any) {
        throw new Error(`Git Clone Failed: ${cloneError.message}`);
      }

      // 2. Build via Docker (Simulated)
      await this.log(deploymentId, 'Building Docker image...', LogLevel.INFO);
      
      await this.log(deploymentId, 'Installing dependencies...', LogLevel.INFO);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.log(deploymentId, 'Running build command...', LogLevel.INFO);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. Success
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: DeploymentStatus.READY,
          readyAt: new Date(),
          url: `https://${deployment.project.slug}-${deploymentId.substring(0, 6)}.deployflow.app`,
        },
      });
      io.to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.READY);

      await this.log(deploymentId, '✅ Build completed successfully!', LogLevel.INFO);
    } catch (error: any) {
      logger.error(`Build failed for ${deploymentId}:`, error);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.ERROR, errorMessage: error.message },
      });
      io.to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.ERROR);
      await this.log(deploymentId, `❌ Build failed: ${error.message}`, LogLevel.ERROR);
    } finally {
      // Cleanup build dir
    }
  }

  static async log(deploymentId: string, message: string, level: LogLevel) {
    const log = await prisma.buildLog.create({
      data: {
        deploymentId,
        message,
        level,
      },
    });

    io.to(`deployment:${deploymentId}`).emit('deployment:log', {
      id: log.id,
      content: log.message,
      level: log.level.toLowerCase(),
      timestamp: log.timestamp,
    });
  }
}
