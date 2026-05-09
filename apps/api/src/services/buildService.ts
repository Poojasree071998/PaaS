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
const projectBuildDirs = new Map<string, string>(); // projectId -> path
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

    // Start build directly in background for instant response
    this.runBuild(deployment.id).catch(e => {
      logger.error(`Immediate build start failed:`, e);
      this.log(deployment.id, `❌ Failed to start build: ${e.message}`, LogLevel.ERROR);
    });
    
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
    const buildDir = path.join(process.cwd(), 'temp-builds', deployment.projectId);
    
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

      if (projectDatabases.length === 0) {
        await this.log(deploymentId, `⚠️ No databases linked to this project. Please link a database in the 'Databases' tab to enable automatic cloud connection.`, LogLevel.WARN);
      }

      // --- INTELLIGENT AUTO-CONFIG ---
      const pkgPath = path.join(buildDir, 'package.json');
      let buildCommand = deployment.project.buildCommand;
      
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        
        // Auto-detect Build Command
        if (!buildCommand || buildCommand === 'npm run build') {
          if (pkg.scripts?.build) buildCommand = 'npm run build';
          else if (pkg.scripts?.compile) buildCommand = 'npm run compile';
          else await this.log(deploymentId, `ℹ️ No build script found. Skipping build step.`, LogLevel.INFO);
        }

        // Auto-detect Framework for UI
        if (pkg.dependencies?.next) await this.log(deploymentId, `🚀 Smart-Detect: Next.js project identified.`, LogLevel.INFO);
        else if (pkg.devDependencies?.vite) await this.log(deploymentId, `⚡ Smart-Detect: Vite project identified.`, LogLevel.INFO);
      }

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
      const hashFile = path.join(workingDir, '.last-install-hash');
      const modulesPath = path.join(workingDir, 'node_modules');
      
      let shouldInstall = true;
      // Rigorous check: Hash must match AND node_modules must exist AND not be empty
      if (fs.existsSync(pkgPath) && fs.existsSync(modulesPath)) {
        const currentHash = require('crypto').createHash('md5').update(fs.readFileSync(pkgPath)).digest('hex');
        const lastHash = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, 'utf8') : '';
        const modulesExist = fs.readdirSync(modulesPath).length > 5; // Basic check for meaningful content
        
        if (currentHash === lastHash && modulesExist) {
          await this.log(deploymentId, `⚡ Fast-Track: dependencies verified. Skipping install phase!`, LogLevel.INFO);
          shouldInstall = false;
        } else {
          await this.log(deploymentId, `📦 Cache stale or incomplete. Preparing fresh install...`, LogLevel.INFO);
          fs.writeFileSync(hashFile, currentHash);
        }
      }

      if (shouldInstall) {
        await this.log(deploymentId, `[2/4] 📦 Synchronizing dependencies (First build may take 2-3 minutes)...`, LogLevel.INFO);
        await this.executeLiveCommand(
          deploymentId, 
          'npm', 
          ['install', '--include=dev', '--prefer-offline', '--no-audit', '--no-fund', '--loglevel', 'info'], 
          workingDir, 
          env, 
          1200000
        );
        await this.log(deploymentId, `✅ Dependencies synchronized.`, LogLevel.INFO);
      }

      // --- STEP 6: BUILD PROCESS ---
      await this.log(deploymentId, `[3/4] 🔨 Building project...`, LogLevel.INFO);
      
      // --- MAGIC CODE PATCHER (Zero-Config DB) ---
      try {
        await this.patchHardcodedLinks(workingDir, deploymentId, env);
      } catch (e: any) {
        await this.log(deploymentId, `⚠️ Code patching skipped: ${e.message}`, LogLevel.WARN);
      }

      // Execute build command
      if (buildCommand && buildCommand !== 'SKIP') {
        const buildParts = buildCommand.split('&&').map(c => c.trim());
        for (const part of buildParts) {
          // If the user included npm install in their command, skip it if we already did it
          if (part.startsWith('npm install') && !shouldInstall) {
            await this.log(deploymentId, `⚡ Skipping redundant '${part}' as dependencies are already synced.`, LogLevel.INFO);
            continue;
          }
          
          await this.log(deploymentId, `🏃 Running: ${part}`, LogLevel.INFO);
          await this.executeLiveCommand(deploymentId, part, [], workingDir, env, 1200000);
        }
      } else if (!buildCommand) {
        // Fallback for zero-config build
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.scripts?.build) {
            await this.log(deploymentId, `🏃 Running: npm run build`, LogLevel.INFO);
            await this.executeLiveCommand(deploymentId, 'npm run build', [], workingDir, env, 1200000);
          }
        }
      }

      // --- STEP 7 & 8: START BACKEND / SERVE FRONTEND ---
      const hasDist = fs.existsSync(path.join(workingDir, 'dist')) || fs.existsSync(path.join(workingDir, 'build'));
      
      if (hasDist) {
        await this.log(deploymentId, `🌐 Static Frontend detected. Serving from /dist...`, LogLevel.INFO);
        // In a real app, this would start an Nginx container. Here we use our internal static server.
      } else {
        await this.log(deploymentId, `🔌 Backend service detected. Starting with 'npm start'...`, LogLevel.INFO);
        this.executeLiveCommand(deploymentId, 'npm', ['start'], workingDir, env).catch(() => {});
      }

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
      buildingDeployments.delete(deploymentId);
      let rawError = error.message || 'Build failed';
      const friendlyMessage = this.translateError(rawError);
      
      // Self-Healing: If it's a module error, clear the install hash
      if (rawError.includes('Cannot find module')) {
        const hashFile = path.join(buildDir, '.last-install-hash');
        if (fs.existsSync(hashFile)) fs.unlinkSync(hashFile);
      }

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: DeploymentStatus.ERROR, errorMessage: friendlyMessage },
      });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.ERROR);
      await this.log(deploymentId, `❌ FAILED: ${friendlyMessage}`, LogLevel.ERROR);
    } finally {
      buildingDeployments.delete(deploymentId);
    }
  }

  private static translateError(error: string): string {
    if (error.includes('MONGODB_URI') || error.includes('mongoose')) {
      return 'MongoDB URL is missing or incorrect. Please add your MONGODB_URI to environment variables.';
    }
    if (error.includes('npm run build') && error.includes('missing')) {
      return 'Build failed because the "build" script is missing in your package.json.';
    }
    if (error.includes('ENOENT')) {
      return 'A required file was not found. Please check your root directory settings.';
    }
    return error;
  }

  // Uses 'spawn' instead of 'exec' for REAL-TIME line-by-line logging
  private static async executeLiveCommand(deploymentId: string, command: string, args: string[], cwd: string, env: any = {}, timeoutMs: number = 300000) {
    return new Promise((resolve, reject) => {
      // If args is empty, assume command is the full string to run in shell
      const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      
      const child = spawn(command, args, { 
        cwd, 
        shell: true,
        env: { ...process.env, ...env }
      });
      
      const timeout = setTimeout(() => {
        child.kill('SIGKILL'); // Force kill on timeout
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
          // Some tools use stderr for info/warnings, so we log as WARN
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

  private static async patchHardcodedLinks(dir: string, deploymentId: string, env: any) {
    const files = await fsPromises.readdir(dir, { recursive: true });
    let patchedCount = 0;

    const mongoUrl = env.MONGODB_URI || '';
    const pgUrl = env.DATABASE_URL || '';

    for (const file of files) {
      const fullPath = path.join(dir, file as string);
      const stat = await fsPromises.stat(fullPath).catch(() => null);
      if (!stat) continue;
      
      if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.env') || fullPath.endsWith('.json'))) {
        let content = await fsPromises.readFile(fullPath, 'utf8');
        const originalContent = content;

        // Replace MongoDB localhost links with real values if available
        if (mongoUrl) {
          content = content.replace(/(mongodb:\/\/)?localhost:27017[^\s'"`]*/g, mongoUrl);
          content = content.replace(/(mongodb:\/\/)?127\.0\.0\.1:27017[^\s'"`]*/g, mongoUrl);
        }
        
        // Replace Postgres localhost links with real values if available
        if (pgUrl) {
          content = content.replace(/(postgresql:\/\/)?localhost:5432[^\s'"`]*/g, pgUrl);
          content = content.replace(/(postgresql:\/\/)?127\.0\.0\.1:5432[^\s'"`]*/g, pgUrl);
        }

        if (content !== originalContent) {
          await fsPromises.writeFile(fullPath, content);
          patchedCount++;
        }
      }
    }

    if (patchedCount > 0) {
      await this.log(deploymentId, `🪄 Magic Patch: Automatically updated ${patchedCount} file(s) with your real Cloud Database links.`, LogLevel.INFO);
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
