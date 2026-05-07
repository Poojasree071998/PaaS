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

    // Start real-world build process
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

      // 1. Clone repo
      await fs.mkdir(buildDir, { recursive: true });
      const git = simpleGit({
        baseDir: buildDir,
        binary: 'git',
      }).env('GIT_TERMINAL_PROMPT', '0');

      await this.log(deploymentId, `📥 [1/3] Cloning repository: ${deployment.project.repoUrl}...`, LogLevel.INFO);
      await git.clone(deployment.project.repoUrl, '.', ['--depth', '1']);
      await this.log(deploymentId, `✅ Repository cloned successfully.`, LogLevel.INFO);

      // 2. Resolve Working Directory
      let workingDir = buildDir;
      if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
        const cleanRoot = deployment.project.rootDirectory.replace(/^\.\//, '');
        workingDir = path.join(buildDir, cleanRoot);
      }

      // 3. ACTUAL BUILD PROCESS
      await this.log(deploymentId, `📦 [2/3] Running: npm install...`, LogLevel.INFO);
      
      // Execute npm install
      await this.executeCommand(deploymentId, 'npm install', workingDir);
      
      await this.log(deploymentId, `🔨 [3/3] Running Build: ${deployment.project.buildCommand || 'npm run build'}...`, LogLevel.INFO);
      
      // Execute npm run build
      await this.executeCommand(deploymentId, deployment.project.buildCommand || 'npm run build', workingDir);

      // 4. Success - Generate Live URL
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
      await this.log(deploymentId, `❌ BUILD FAILED: ${error.message}`, LogLevel.ERROR);
    }
  }

  // Helper to execute shell commands and stream real-time logs
  private static async executeCommand(deploymentId: string, command: string, cwd: string) {
    return new Promise((resolve, reject) => {
      const child = exec(command, { cwd });

      child.stdout?.on('data', (data) => {
        this.log(deploymentId, data.toString().trim(), LogLevel.INFO);
      });

      child.stderr?.on('data', (data) => {
        this.log(deploymentId, data.toString().trim(), LogLevel.WARN);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    });
  }

  static async log(deploymentId: string, message: string, level: LogLevel) {
    if (!message) return;
    
    try {
      const log = await prisma.buildLog.create({
        data: {
          deploymentId,
          message: message.substring(0, 1000), // Safety cap
          level,
        },
      });

      getIO().to(`deployment:${deploymentId}`).emit('deployment:log', {
        id: log.id,
        content: log.message,
        level: log.level.toLowerCase(),
        timestamp: log.timestamp,
      });
    } catch (e) {
      console.error('Logging failed:', e);
    }
  }
}
