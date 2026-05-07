import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { spawn } from 'child_process';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { DeploymentStatus, LogLevel } from '@prisma/client';
import { getIO } from '../config/socket';

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

    this.runBuild(deployment.id).catch(err => logger.error('Build process failed:', err));
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
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.BUILDING);

      await fsPromises.mkdir(buildDir, { recursive: true });
      const git = simpleGit({ baseDir: buildDir, binary: 'git' });

      await this.log(deploymentId, `📥 [1/3] Cloning repository...`, LogLevel.INFO);
      await git.clone(deployment.project.repoUrl, '.', ['--depth', '1']);
      await this.log(deploymentId, `✅ Repository cloned.`, LogLevel.INFO);

      let workingDir = buildDir;
      if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
        workingDir = path.join(buildDir, deployment.project.rootDirectory.replace(/^\.\//, ''));
      }

      // --- CACHE RESTORATION ---
      const cacheDir = path.join(process.cwd(), 'cache', Buffer.from(deployment.project.repoUrl).toString('base64').substring(0, 16));
      const targetModules = path.join(workingDir, 'node_modules');
      
      if (!fs.existsSync(path.join(process.cwd(), 'cache'))) {
        fs.mkdirSync(path.join(process.cwd(), 'cache'), { recursive: true });
      }

      if (fs.existsSync(cacheDir)) {
        await this.log(deploymentId, `♻️ Restoring build cache for faster deployment...`, LogLevel.INFO);
        // Using shell command to copy quickly
        await this.executeLiveCommand(deploymentId, 'cp', ['-r', `${cacheDir}/.`, targetModules], workingDir, 60000).catch(() => {});
      }

      // --- REAL-TIME STREAMING ENGINE ---
      await this.log(deploymentId, `📦 [2/3] Installing Production Dependencies...`, LogLevel.INFO);
      await this.executeLiveCommand(deploymentId, 'npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--loglevel', 'info'], workingDir, 1200000); // 20 min timeout

      // --- SAVE CACHE ---
      await this.log(deploymentId, `💾 Saving build cache for future use...`, LogLevel.INFO);
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      await this.executeLiveCommand(deploymentId, 'cp', ['-r', `${targetModules}/.`, cacheDir], workingDir, 120000).catch(() => {});
      
      await this.log(deploymentId, `🔨 [3/3] Running Build: ${deployment.project.buildCommand || 'npm run build'}...`, LogLevel.INFO);
      const buildParts = (deployment.project.buildCommand || 'npm run build').split(' ');
      const cmd = buildParts[0];
      const args = buildParts.slice(1);
      
      await this.executeLiveCommand(deploymentId, cmd, args, workingDir, 1200000); // 20 min timeout

      // --- SUCCESS ---
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'deployflow-api';
      if (!apiUrl.startsWith('http')) apiUrl = `https://${apiUrl}`;
      if (!apiUrl.includes('.')) apiUrl = `${apiUrl}.onrender.com`;
      
      const projectUrl = `${apiUrl}/live/${deploymentId}`;

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: DeploymentStatus.READY,
          readyAt: new Date(),
          url: projectUrl,
        },
      });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.READY);

      await this.log(deploymentId, `✨ SUCCESS! Live at: ${projectUrl}`, LogLevel.INFO);
    } catch (error: any) {
      logger.error(`Build failed:`, error);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.ERROR, errorMessage: error.message },
      });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.ERROR);
      await this.log(deploymentId, `❌ FAILED: ${error.message}`, LogLevel.ERROR);
    }
  }

  // Uses 'spawn' instead of 'exec' for REAL-TIME line-by-line logging
  private static async executeLiveCommand(deploymentId: string, command: string, args: string[], cwd: string, timeoutMs: number = 300000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, shell: true });
      
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) this.log(deploymentId, line.trim(), LogLevel.INFO);
        });
      });

      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) this.log(deploymentId, line.trim(), LogLevel.WARN);
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve(true);
        else reject(new Error(`Exit code ${code}`));
      });
    });
  }

  static async cleanupStuckBuilds() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const stuckDeployments = await prisma.deployment.findMany({
        where: {
          status: DeploymentStatus.BUILDING,
          updatedAt: { lt: fifteenMinutesAgo },
        },
      });

      for (const dep of stuckDeployments) {
        await prisma.deployment.update({
          where: { id: dep.id },
          data: { 
            status: DeploymentStatus.ERROR, 
            errorMessage: 'Build process was interrupted (likely due to server restart or OOM)' 
          },
        });
        await this.log(dep.id, '❌ ERROR: Build process was interrupted. Please try again.', LogLevel.ERROR);
      }
    } catch (e) {
      logger.error('Failed to cleanup stuck builds:', e);
    }
  }

  static async log(deploymentId: string, message: string, level: LogLevel) {
    if (!message) return;
    try {
      const log = await prisma.buildLog.create({
        data: { deploymentId, message: message.substring(0, 500), level },
      });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:log', {
        id: log.id,
        content: log.message,
        level: log.level.toLowerCase(),
        timestamp: log.timestamp,
      });
    } catch (e) {}
  }
}
