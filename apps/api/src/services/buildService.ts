import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { spawn } from 'child_process';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { DeploymentStatus, LogLevel, DatabaseType } from '@prisma/client';
import { getIO } from '../config/socket';
import { Framework } from '@prisma/client';
import { buildQueue } from '../queues';

const runningProcesses = new Map<string, any>(); // deploymentId -> { process, port }
const buildingDeployments = new Set<string>(); // deploymentId

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

    try {
      await this.enqueueBuild(deployment.id);
    } catch (err) {
      logger.warn(`Failed to enqueue build for ${deployment.id}, starting directly as fallback.`);
      // Start build in background without awaiting to return response to user
      this.runBuild(deployment.id).catch(e => logger.error(`Direct build fallback failed:`, e));
    }
    
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
    if (buildingDeployments.has(deploymentId)) {
      logger.warn(`Build already in progress for deployment ${deploymentId}, skipping.`);
      return;
    }

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { 
        project: {
          include: {
            envVars: true,
            databases: true
          }
        } 
      },
    });

    if (!deployment) return;

    // Kill any existing process BEFORE starting build to free up files
    const existing = runningProcesses.get(deploymentId);
    if (existing && existing.process) {
      logger.info(`Killing existing process for deployment ${deploymentId} before rebuild.`);
      try {
        existing.process.kill('SIGKILL');
      } catch (e) {}
      runningProcesses.delete(deploymentId);
    }

    buildingDeployments.add(deploymentId);
    const buildDir = path.join(process.cwd(), 'temp-builds', deploymentId);
    
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.BUILDING },
      });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.BUILDING);

      await this.log(deploymentId, `[1/4] 📥 Fetching updates...`, LogLevel.INFO);
      
      if (!fs.existsSync(buildDir)) {
        await fsPromises.mkdir(buildDir, { recursive: true });
      }

      const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'true' };
      
      if (fs.existsSync(path.join(buildDir, '.git'))) {
        await this.log(deploymentId, `♻️ Project folder exists, pulling latest changes...`, LogLevel.INFO);
        await this.executeLiveCommand(deploymentId, 'git', ['fetch', '--all'], buildDir, gitEnv, 60000);
        await this.executeLiveCommand(deploymentId, 'git', ['reset', '--hard', `origin/${deployment.branch}`], buildDir, gitEnv, 30000);
        await this.log(deploymentId, `✅ Project updated via incremental pull.`, LogLevel.INFO);
      } else {
        await this.log(deploymentId, `📦 Cloning fresh repository: ${deployment.project.repoUrl}`, LogLevel.INFO);
        try {
          await this.executeLiveCommand(deploymentId, 'git', ['clone', '--depth', '1', '-b', deployment.branch, deployment.project.repoUrl, '.'], buildDir, gitEnv, 120000);
        } catch (err) {
          await this.log(deploymentId, `⚠️ Branch '${deployment.branch}' not found. Cleaning up for fallback...`, LogLevel.WARN);
          // Wipe the directory contents to ensure fallback clone works on an empty path
          const files = await fsPromises.readdir(buildDir);
          for (const file of files) {
            await fsPromises.rm(path.join(buildDir, file), { recursive: true, force: true }).catch(() => {});
          }
          await this.log(deploymentId, `🔄 Attempting to clone default branch...`, LogLevel.INFO);
          await this.executeLiveCommand(deploymentId, 'git', ['clone', '--depth', '1', deployment.project.repoUrl, '.'], buildDir, gitEnv, 120000);
        }
        await this.log(deploymentId, `✅ Fresh repository cloned.`, LogLevel.INFO);
      }

      // --- ENVIRONMENT GATHERING ---
      const projectDatabases = await prisma.managedDatabase.findMany({
        where: { projectId: deployment.projectId }
      });

      const env: Record<string, string> = {
        NODE_ENV: 'development', // Must be development during build to install devDependencies (Vite, etc)
        PORT: '3000',
        ...Object.fromEntries(deployment.project.envVars.map((v: any) => [v.key, v.value])),
      };

      // Auto-inject database credentials
      projectDatabases.forEach(db => {
        const dbType = db.type as string;
        if (dbType === 'POSTGRES') env.DATABASE_URL = db.connectionString;
        if (dbType === 'REDIS') env.REDIS_URL = db.connectionString;
        if (dbType === 'MONGODB') env.MONGODB_URI = db.connectionString;
        // Also inject as generic names for compatibility
        env[`DB_${db.name.toUpperCase()}_URL`] = db.connectionString;
      });

      await this.log(deploymentId, `✅ Environment initialized with ${projectDatabases.length} database(s).`, LogLevel.INFO);

      let workingDir = buildDir;
      if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
        workingDir = path.join(buildDir, deployment.project.rootDirectory.replace(/^\.\//, ''));
      }

      // Inject local bin to PATH so 'vite', 'next', etc are found
      const localBin = path.join(workingDir, 'node_modules', '.bin');
      env.PATH = `${localBin}${path.delimiter}${process.env.PATH}`;

      // --- LIGHTNING-FAST INSTALL ENGINE ---
      const pkgPath = path.join(workingDir, 'package.json');
      const hashFile = path.join(workingDir, '.last-install-hash');
      
      let shouldInstall = true;
      if (fs.existsSync(pkgPath) && fs.existsSync(path.join(workingDir, 'node_modules'))) {
        const currentHash = require('crypto').createHash('md5').update(fs.readFileSync(pkgPath)).digest('hex');
        const lastHash = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, 'utf8') : '';
        
        if (currentHash === lastHash) {
          await this.log(deploymentId, `⚡ Fast-Track: package.json unchanged. Skipping install phase!`, LogLevel.INFO);
          shouldInstall = false;
        } else {
          fs.writeFileSync(hashFile, currentHash);
        }
      }

      if (shouldInstall) {
        await this.log(deploymentId, `[2/4] 📦 Synchronizing dependencies...`, LogLevel.INFO);
        await this.executeLiveCommand(
          deploymentId, 
          'npm', 
          ['install', '--include=dev', '--prefer-offline', '--no-audit', '--no-fund', '--loglevel', 'error'], 
          workingDir, 
          env, 
          1200000
        );
        await this.log(deploymentId, `✅ Dependencies synchronized.`, LogLevel.INFO);
      }

      await this.log(deploymentId, `[3/4] 🔨 Building project...`, LogLevel.INFO);
      
      // --- MAGIC CODE PATCHER (Zero-Config DB) ---
      try {
        await this.patchHardcodedLinks(workingDir, deploymentId);
      } catch (e: any) {
        await this.log(deploymentId, `⚠️ Code patching skipped: ${e.message}`, LogLevel.WARN);
      }

      const buildParts = (deployment.project.buildCommand || 'npm run build').split(' ');
      const cmd = buildParts[0];
      const args = buildParts.slice(1);
      
      await this.executeLiveCommand(deploymentId, cmd, args, workingDir, env, 1200000); // 20 min timeout

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
    } finally {
      buildingDeployments.delete(deploymentId);
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

  private static async patchHardcodedLinks(dir: string, deploymentId: string) {
    const files = await fsPromises.readdir(dir, { recursive: true });
    let patchedCount = 0;

    for (const file of files) {
      const fullPath = path.join(dir, file as string);
      const stat = await fsPromises.stat(fullPath);
      
      if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.env') || fullPath.endsWith('.json'))) {
        let content = await fsPromises.readFile(fullPath, 'utf8');
        const originalContent = content;

        // Replace MongoDB localhost links
        content = content.replace(/mongodb:\/\/localhost:27017/g, 'process.env.MONGODB_URI');
        content = content.replace(/mongodb:\/\/127\.0\.0\.1:27017/g, 'process.env.MONGODB_URI');
        
        // Replace Postgres localhost links
        content = content.replace(/postgresql:\/\/localhost:5432/g, 'process.env.DATABASE_URL');
        content = content.replace(/postgresql:\/\/127\.0\.0\.1:5432/g, 'process.env.DATABASE_URL');

        if (content !== originalContent) {
          await fsPromises.writeFile(fullPath, content);
          patchedCount++;
        }
      }
    }

    if (patchedCount > 0) {
      await this.log(deploymentId, `🪄 Magic Patch: Automatically updated ${patchedCount} file(s) to use cloud database variables.`, LogLevel.INFO);
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
