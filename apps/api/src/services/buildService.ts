import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { spawn } from 'child_process';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { DeploymentStatus, LogLevel } from '@prisma/client';
import { getIO } from '../config/socket';
import { Framework } from '@prisma/client';
import { buildQueue } from '../queues';

const runningProcesses = new Map<string, any>(); // deploymentId -> { process, port }

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

    this.enqueueBuild(deployment.id);
    return deployment;
  }

  static async enqueueBuild(deploymentId: string) {
    await buildQueue.add(`build-${deploymentId}`, { deploymentId }, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });
    logger.info(`Build job enqueued for deployment ${deploymentId}`);
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

      // Clean up existing directory if any (ensures fresh recovery)
      if (fs.existsSync(buildDir)) {
        await fsPromises.rm(buildDir, { recursive: true, force: true }).catch(() => {});
      }
      
      await fsPromises.mkdir(buildDir, { recursive: true });
      await this.log(deploymentId, `[1/4] 📥 Cloning repository...`, LogLevel.INFO);
      const git = simpleGit({ baseDir: buildDir, binary: 'git' });
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
      await this.log(deploymentId, `[2/4] 📦 Installing dependencies...`, LogLevel.INFO);
      await this.executeLiveCommand(deploymentId, 'npm', ['install', '--no-audit', '--no-fund', '--loglevel', 'info'], workingDir, { NODE_ENV: 'development' }, 1200000); // 20 min timeout

      // --- SAVE CACHE ---
      await this.log(deploymentId, `💾 Saving build cache for future use...`, LogLevel.INFO);
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      await this.executeLiveCommand(deploymentId, 'cp', ['-r', `${targetModules}/.`, cacheDir], workingDir, 120000).catch(() => {});
      
      await this.log(deploymentId, `[3/4] 🔨 Running Build: ${deployment.project.buildCommand || 'npm run build'}...`, LogLevel.INFO);
      const buildParts = (deployment.project.buildCommand || 'npm run build').split(' ');
      const cmd = buildParts[0];
      const args = buildParts.slice(1);
      
      await this.executeLiveCommand(deploymentId, cmd, args, workingDir, { NODE_ENV: 'development' }, 1200000); // 20 min timeout

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
      await this.log(deploymentId, `[4/4] 🚀 Deploying to live servers...`, LogLevel.INFO);
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.READY);

      // --- BACKEND EXECUTION ENGINE ---
      const backendFrameworks: string[] = [Framework.EXPRESS, Framework.FASTAPI, Framework.DJANGO, Framework.RAILS, Framework.LARAVEL, Framework.NEXTJS];
      if (backendFrameworks.includes(deployment.project.framework as string)) {
        // Kill existing process for this deployment if it exists
        const existing = runningProcesses.get(deploymentId);
        if (existing && existing.process) {
          existing.process.kill();
        }

        await this.log(deploymentId, `🚀 Starting Backend Process...`, LogLevel.INFO);
        
        // Assign a random free port (3001-9999)
        const port = Math.floor(Math.random() * 7000) + 3000;
        
        const startCmd = (deployment.project as any).startCommand || 'npm start';
        const [cmd, ...args] = startCmd.split(' ');

        const child = spawn(cmd, args, {
          cwd: workingDir,
          shell: true,
          env: { ...process.env, PORT: port.toString(), NODE_ENV: 'production' }
        });

        runningProcesses.set(deploymentId, { process: child, port });

        child.stdout.on('data', (data) => this.log(deploymentId, data.toString().trim(), LogLevel.INFO));
        child.stderr.on('data', (data) => this.log(deploymentId, data.toString().trim(), LogLevel.WARN));

        await prisma.deployment.update({
          where: { id: deploymentId },
          data: { meta: { port } }
        });

        await this.log(deploymentId, `🟢 Backend running on port ${port}`, LogLevel.INFO);
      }

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
  private static async executeLiveCommand(deploymentId: string, command: string, args: string[], cwd: string, env: any = {}, timeoutMs: number = 300000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { 
        cwd, 
        shell: true,
        env: { ...process.env, ...env }
      });
      
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

  static getRunningPort(deploymentId: string): number | null {
    return runningProcesses.get(deploymentId)?.port || null;
  }

  static isProcessRunning(deploymentId: string): boolean {
    const proc = runningProcesses.get(deploymentId);
    return !!(proc && proc.process && !proc.process.killed);
  }

  static getActiveProcessCount(): number {
    return runningProcesses.size;
  }
}
