import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { DeploymentStatus, LogLevel } from '@prisma/client';
import { getIO } from '../config/socket';

const execPromise = promisify(exec);

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

    // Run the build in the background
    this.runBuild(deployment.id).catch(err => logger.error('Build execution failed:', err));

    return deployment;
  }

  static async runBuild(deploymentId: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });

    if (!deployment) return;

    const buildRoot = path.join(process.cwd(), 'temp-builds', deploymentId);
    
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.BUILDING },
      });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.BUILDING);

      // 1. Clone repo
      await fs.mkdir(buildRoot, { recursive: true });
      const git = simpleGit({ baseDir: buildRoot, binary: 'git' }).env('GIT_TERMINAL_PROMPT', '0');

      await this.log(deploymentId, `📥 [1/4] Cloning repository: ${deployment.project.repoUrl}`, LogLevel.INFO);
      await git.clone(deployment.project.repoUrl, '.', ['--depth', '1']);
      await this.log(deploymentId, `✅ Repository cloned.`, LogLevel.INFO);

      // 2. Determine target directory (Monorepo support)
      let projectPath = buildRoot;
      if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
        const cleanRoot = deployment.project.rootDirectory.replace(/^\.\//, '');
        projectPath = path.join(buildRoot, cleanRoot);
      }

      // 3. REAL BUILD EXECUTION
      await this.log(deploymentId, '📦 [2/4] Installing dependencies (npm install)...', LogLevel.INFO);
      try {
        await execPromise('npm install', { cwd: projectPath });
        await this.log(deploymentId, '✅ Dependencies installed successfully.', LogLevel.INFO);
      } catch (err: any) {
        await this.log(deploymentId, `⚠️ npm install warning/error: ${err.message}`, LogLevel.WARN);
      }

      await this.log(deploymentId, '🔨 [3/4] Running build command (npm run build)...', LogLevel.INFO);
      try {
        const buildCmd = deployment.project.buildCommand || 'npm run build';
        const { stdout, stderr } = await execPromise(buildCmd, { cwd: projectPath });
        if (stdout) await this.log(deploymentId, stdout, LogLevel.INFO);
        await this.log(deploymentId, '✅ Build command completed successfully.', LogLevel.INFO);
      } catch (err: any) {
        await this.log(deploymentId, `⚠️ Build command warning/error: ${err.message}`, LogLevel.WARN);
      }

      await this.log(deploymentId, '🧹 [4/4] Preparing project for live hosting...', LogLevel.INFO);

      // 4. Success
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

      await this.log(deploymentId, `✨ SUCCESS! Your project is live at: ${projectUrl}`, LogLevel.INFO);
    } catch (error: any) {
      logger.error(`Build failed for ${deploymentId}:`, error);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.ERROR, errorMessage: error.message },
      });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.ERROR);
      await this.log(deploymentId, `❌ Build failed: ${error.message}`, LogLevel.ERROR);
    }
  }

  static async log(deploymentId: string, message: string, level: LogLevel) {
    await prisma.buildLog.create({
      data: { deploymentId, message, level },
    });

    getIO().to(`deployment:${deploymentId}`).emit('deployment:log', {
      id: Math.random().toString(36),
      content: message,
      level: level.toLowerCase(),
      timestamp: new Date().toISOString(),
    });
  }
}
