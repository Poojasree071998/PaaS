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

    if (buildingDeployments.has(deployment.projectId)) {
      await this.log(deploymentId, `⏳ Another build is in progress for this project. Please wait...`, LogLevel.WARN);
      return;
    }
    buildingDeployments.add(deployment.projectId);
    const buildDir = path.resolve(process.cwd(), 'temp-builds', deployment.projectId);
    
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
        await this.log(deploymentId, `📦 Cloning repository: ${deployment.project.repoUrl}`, LogLevel.INFO);
        try {
          await this.executeLiveCommand(deploymentId, 'git', ['clone', '--depth', '1', '-b', deployment.branch, deployment.project.repoUrl, '.'], buildDir, gitEnv, 120000);
        } catch (err) {
          await this.log(deploymentId, `⚠️ Branch '${deployment.branch}' not found. Checking default branch...`, LogLevel.WARN);
          const files = await fsPromises.readdir(buildDir);
          for (const file of files) {
            await fsPromises.rm(path.join(buildDir, file), { recursive: true, force: true }).catch(() => {});
          }
          await this.log(deploymentId, `🔄 Falling back to default branch (master/main)...`, LogLevel.INFO);
          await this.executeLiveCommand(deploymentId, 'git', ['clone', '--depth', '1', deployment.project.repoUrl, '.'], buildDir, gitEnv, 120000);
        }
        await this.log(deploymentId, `✅ Repository successfully cloned.`, LogLevel.INFO);
      }

      const projectDatabases = await prisma.managedDatabase.findMany({
        where: { projectId: deployment.projectId }
      });

      const pkgPath = path.join(buildDir, 'package.json');
      let buildCommand = deployment.project.buildCommand;
      let startCommand = 'npm start';
      
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const scripts = pkg.scripts || {};
        
        // 1. Auto-detect Build Command
        if (!buildCommand || buildCommand === 'npm run build' || buildCommand === './') {
          if (scripts.build) buildCommand = 'npm run build';
          else if (scripts.compile) buildCommand = 'npm run compile';
          else if (fs.existsSync(path.join(buildDir, 'next.config.js'))) buildCommand = 'npx next build';
          else if (fs.existsSync(path.join(buildDir, 'vite.config.ts'))) buildCommand = 'npx vite build';
        }

        // 2. Auto-detect Start Command
        if (scripts.start) startCommand = 'npm start';
        else if (scripts.dev) startCommand = 'npm run dev';
        else if (pkg.main) startCommand = `node ${pkg.main}`;
        else if (fs.existsSync(path.join(buildDir, 'index.js'))) startCommand = 'node index.js';
        else if (fs.existsSync(path.join(buildDir, 'server.js'))) startCommand = 'node server.js';

        // 3. Framework Identity Logging
        const isNext = !!pkg.dependencies?.next;
        const isVite = !!pkg.dependencies?.vite || !!pkg.devDependencies?.vite;
        const isReact = !!pkg.dependencies?.react;

        if (isNext) await this.log(deploymentId, `🚀 Smart-Detect: Next.js project identified.`, LogLevel.INFO);
        else if (isVite) await this.log(deploymentId, `⚡ Smart-Detect: Vite project identified.`, LogLevel.INFO);
        else if (isReact) await this.log(deploymentId, `⚛️ Smart-Detect: React project identified.`, LogLevel.INFO);
        else await this.log(deploymentId, `📦 Smart-Detect: Node.js project identified.`, LogLevel.INFO);
      }

      await this.log(deploymentId, `⚙️ Configuration: Build ["${buildCommand || 'none'}"], Start ["${startCommand}"]`, LogLevel.INFO);

      // Store detected commands in meta for the hosting engine to use
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          meta: { 
            ...(deployment.meta as any || {}), 
            detectedBuild: buildCommand, 
            detectedStart: startCommand 
          } 
        }
      });

      const env: Record<string, string> = {
        NODE_ENV: 'development',
        PORT: '3000',
        ...Object.fromEntries(deployment.project.envVars.map((v: any) => [v.key, v.value])),
      };

      projectDatabases.forEach(db => {
        const dbType = db.type as string;
        if (dbType === 'POSTGRES') env.DATABASE_URL = db.connectionString;
        if (dbType === 'REDIS') env.REDIS_URL = db.connectionString;
        if (dbType === 'MONGODB') env.MONGODB_URI = db.connectionString;
      });

      let workingDir = buildDir;
      if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
        workingDir = path.resolve(buildDir, deployment.project.rootDirectory.replace(/^\.\//, ''));
      }

      const localBin = path.join(workingDir, 'node_modules', '.bin');
      const globalCachePath = path.join(process.cwd(), 'npm-cache');
      
      // Ensure the build never leaks out of the temp folder
      env.PATH = `${localBin}${path.delimiter}${process.env.PATH}`;
      env.npm_config_cache = globalCachePath;
      env.HOME = workingDir; // Force Git to look for config only in the temp folder

      // --- LIGHTNING-FAST INSTALL ENGINE ---
      const hashFile = path.join(workingDir, '.last-install-hash');
      const modulesPath = path.join(workingDir, 'node_modules');
      const lockPath = path.join(workingDir, 'package-lock.json');

      if (!fs.existsSync(env.npm_config_cache)) {
        await fsPromises.mkdir(env.npm_config_cache, { recursive: true });
      }
      
      let shouldInstall = true;
      // Rigorous check: Hash must match AND node_modules must exist AND not be empty
      if (fs.existsSync(pkgPath) && fs.existsSync(modulesPath)) {
        const pkgContent = fs.readFileSync(pkgPath);
        const lockContent = fs.existsSync(lockPath) ? fs.readFileSync(lockPath) : '';
        const currentHash = require('crypto').createHash('md5')
          .update(pkgContent)
          .update(lockContent)
          .digest('hex');
          
        const lastHash = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, 'utf8') : '';
        const modulesExist = fs.readdirSync(modulesPath).length > 5;
        
        if (currentHash === lastHash && modulesExist) {
          await this.log(deploymentId, `⚡ Fast-Track: dependencies verified. Skipping install phase!`, LogLevel.INFO);
          shouldInstall = false;
        } else {
          await this.log(deploymentId, `📦 Cache stale or incomplete. Preparing synchronization...`, LogLevel.INFO);
          fs.writeFileSync(hashFile, currentHash);
        }
      }

      if (shouldInstall) {
        const pkgData = fs.readFileSync(pkgPath);
        const pkg = JSON.parse(pkgData.toString());
        const isMonorepo = !!pkg.workspaces;
        const hasLock = fs.existsSync(lockPath);
        
        // Strategy: standard projects use fast 'ci', monorepos use reliable 'install'
        const installCmd = (isMonorepo || !hasLock) ? 'install' : 'ci';
        
        if (isMonorepo) {
          await this.log(deploymentId, `📦 Monorepo Detected (npm workspaces). Using reliable install strategy...`, LogLevel.INFO);
        } else {
          await this.log(deploymentId, `[2/4] 📦 Synchronizing dependencies using ${hasLock ? 'npm ci' : 'npm install'}...`, LogLevel.INFO);
        }
        
        const npmArgs = [
          installCmd,
          '--include=dev',
          '--prefer-offline',
          '--no-audit',
          '--no-fund',
          '--no-bin-links',
          '--legacy-peer-deps',
          '--loglevel', 'error'
        ];

        try {
          await this.executeLiveCommand(deploymentId, 'npm', npmArgs, workingDir, env, 1200000);
        } catch (error) {
          if (hasLock) {
            await this.log(deploymentId, `⚠️ npm ci failed. Falling back to standard npm install...`, LogLevel.WARN);
            await this.executeLiveCommand(deploymentId, 'npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--no-bin-links'], workingDir, env, 1200000);
          } else {
            throw error;
          }
        }

        await this.log(deploymentId, `✅ Dependencies synchronized.`, LogLevel.INFO);
      }

      // --- SMART SUBFOLDER DETECTOR (Always check subfolders) ---
      // We run these sequentially to avoid Windows file locks
      if (fs.existsSync(path.join(workingDir, 'backend', 'package.json'))) {
        await this.log(deploymentId, `📦 Backend subfolder detected. Synchronizing backend dependencies...`, LogLevel.INFO);
        await this.executeLiveCommand(deploymentId, 'npm', ['install', '--prefix', 'backend', '--no-audit', '--no-fund', '--no-bin-links'], workingDir, env, 600000);
      }
      if (fs.existsSync(path.join(workingDir, 'frontend', 'package.json'))) {
        await this.log(deploymentId, `📦 Frontend subfolder detected. Synchronizing frontend dependencies...`, LogLevel.INFO);
        await this.executeLiveCommand(deploymentId, 'npm', ['install', '--prefix', 'frontend', '--no-audit', '--no-fund', '--no-bin-links'], workingDir, env, 600000);
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
          // 1. Skip redundant install/ci commands
          if ((part.startsWith('npm install') || part.startsWith('npm ci')) && !shouldInstall) {
            await this.log(deploymentId, `⚡ Skipping redundant '${part}' as dependencies are already synced.`, LogLevel.INFO);
            continue;
          }
          
          // 2. Smart Script Check: Skip if npm run script is missing in package.json
          if (part.startsWith('npm run ') && fs.existsSync(pkgPath)) {
            const scriptName = part.replace('npm run ', '').split(' ')[0];
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (!pkg.scripts?.[scriptName]) {
              await this.log(deploymentId, `ℹ️ Optional script '${scriptName}' not found. Skipping build step...`, LogLevel.INFO);
              continue;
            }
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
      let apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:4000' 
        : (process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : 'https://deployflow-api.onrender.com');
      
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
        await this.executeBackendProcess(deploymentId, deployment, workingDir, env);
      }

      await this.log(deploymentId, `✨ SUCCESS! Live at: ${projectUrl}`, LogLevel.INFO);
    } catch (error: any) {
      if (deployment?.projectId) buildingDeployments.delete(deployment.projectId);
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
      if (deployment?.projectId) buildingDeployments.delete(deployment.projectId);
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
    const mongoUrl = env.MONGODB_URI || '';
    const pgUrl = env.DATABASE_URL || '';
    let patchedCount = 0;

    const walk = async (currentDir: string) => {
      const files = await fsPromises.readdir(currentDir);
      for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'npm-cache') continue;
        
        const fullPath = path.join(currentDir, file);
        const stat = await fsPromises.stat(fullPath);
        
        if (stat.isDirectory()) {
          await walk(fullPath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.env') || file.endsWith('.json'))) {
          let content = await fsPromises.readFile(fullPath, 'utf8');
          const originalContent = content;

          if (mongoUrl) {
            content = content.replace(/(mongodb:\/\/)?localhost:27017[^\s'"`]*/g, mongoUrl);
            content = content.replace(/(mongodb:\/\/)?127\.0\.0\.1:27017[^\s'"`]*/g, mongoUrl);
          }
          if (pgUrl) {
            content = content.replace(/(postgresql:\/\/)?localhost:5432[^\s'"`]*/g, pgUrl);
            content = content.replace(/(postgresql:\/\/)?127\.0\.0\.1:5432[^\s'"`]*/g, pgUrl);
          }

          // More robust port patching
          const portsToPatch = ['3000', '5000', '8000', '8080', '3001'];
          const originalContentBeforePorts = content;

          portsToPatch.forEach(p => {
            // Match listen(3000), listen( 3000 ), etc.
            const listenRegex = new RegExp(`listen\\(\\s*${p}\\s*\\)`, 'g');
            content = content.replace(listenRegex, `listen(process.env.PORT || ${p})`);

            // Match port = 3000, port: 3000, const port = 3000
            const assignRegex = new RegExp(`port\\s*[:=]\\s*${p}`, 'gi');
            content = content.replace(assignRegex, (match) => {
               const separator = match.includes(':') ? ':' : '=';
               return `port ${separator} process.env.PORT || ${p}`;
            });

            // Match URL style :3000
            const urlRegex = new RegExp(`:${p}(?=[\\s/'"\\?]|$|[^0-9])`, 'g');
            content = content.replace(urlRegex, `:\${process.env.PORT || ${p}}`);
          });

          // --- PAAS AUTO-UNIFY: Full-Stack Detection ---
          if ((file.endsWith('.js') || file.endsWith('.ts')) && 
              (file.includes('index') || file.includes('app') || file.includes('server')) && 
              content.includes('express()') && 
              !content.includes('PAAS AUTO-UNIFY')) {
            
            const fullStackServingCode = `
// --- PAAS AUTO-UNIFY: Serving frontend from backend ---
const fsSync = require('fs');
const pathSync = require('path');
const possiblePaths = [
    pathSync.join(__dirname, '../frontend/dist'),
    pathSync.join(__dirname, './frontend/dist'),
    pathSync.join(__dirname, '../dist'),
    pathSync.join(__dirname, './dist')
];
const frontendBuildPath = possiblePaths.find(p => fsSync.existsSync(p));

if (frontendBuildPath) {
    console.log('✅ PaaS: Serving frontend from', frontendBuildPath);
    app.use(express.static(frontendBuildPath));
    app.get(/^\\/(?!api).*/, (req, res) => {
        res.sendFile(pathSync.join(frontendBuildPath, 'index.html'));
    });
}
`;
            if (content.includes('app.listen')) {
              content = content.replace('app.listen', `${fullStackServingCode}\n\napp.listen`);
            } else {
              content += `\n${fullStackServingCode}`;
            }
          }

          if (content !== originalContent) {
            await fsPromises.writeFile(fullPath, content);
            patchedCount++;
          }
        }
      }
    };

    await walk(dir).catch(e => logger.warn(`Magic Patch partial failure: ${e.message}`));

    if (patchedCount > 0) {
      await this.log(deploymentId, `🪄 Magic Patch: Automatically updated ${patchedCount} file(s) with your real Cloud Database links.`, LogLevel.INFO);
    }
  }

  static async ensureRunning(deploymentId: string) {
    if (this.isProcessRunning(deploymentId)) return true;

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { 
        project: {
          include: { envVars: true, databases: true }
        } 
      }
    });

    if (!deployment || deployment.status !== DeploymentStatus.READY) return false;

    const buildDir = path.join(process.cwd(), 'temp-builds', deployment.projectId);
    let workingDir = buildDir;
    if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
      workingDir = path.join(buildDir, deployment.project.rootDirectory.replace(/^\.\//, ''));
    }

    if (!fs.existsSync(workingDir)) {
      // If files are gone, we must rebuild
      this.runBuild(deploymentId).catch(() => {});
      return false;
    }

    // Construct env
    const env: any = {
      NODE_ENV: 'production',
      ...Object.fromEntries(deployment.project.envVars.map((v: any) => [v.key, v.value])),
    };

    // Inject database credentials
    const projectDatabases = await prisma.managedDatabase.findMany({
      where: { projectId: deployment.projectId }
    });
    projectDatabases.forEach(db => {
      const dbType = db.type as string;
      if (dbType === 'POSTGRES') env.DATABASE_URL = db.connectionString;
      if (dbType === 'REDIS') env.REDIS_URL = db.connectionString;
      if (dbType === 'MONGODB') env.MONGODB_URI = db.connectionString;
    });

    const localBin = path.join(workingDir, 'node_modules', '.bin');
    env.PATH = `${localBin}${path.delimiter}${process.env.PATH}`;
    env.npm_config_cache = path.join(process.cwd(), 'npm-cache');

    await this.log(deploymentId, `🔄 Waking up deployment from disk...`, LogLevel.INFO);
    
    // We don't await this so it can run in background
    this.executeBackendProcess(deploymentId, deployment, workingDir, env).catch(err => {
      this.log(deploymentId, `❌ Failed to wake up: ${err.message}`, LogLevel.ERROR);
    });

    return true;
  }

  private static async executeBackendProcess(deploymentId: string, deployment: any, workingDir: string, env: any) {
    const backendFrameworks: string[] = [Framework.EXPRESS, Framework.FASTAPI, Framework.DJANGO, Framework.RAILS, Framework.LARAVEL, Framework.NEXTJS];
    if (!backendFrameworks.includes(deployment.project.framework as string)) return;

    const port = Math.floor(Math.random() * 7000) + 3000;
    const startCmd = deployment.project.startCommand || 'npm start';
    const [cmd, ...args] = startCmd.split(' ');

    const child = spawn(cmd, args, {
      cwd: workingDir,
      shell: true,
      env: { ...process.env, ...env, PORT: port.toString(), NODE_ENV: 'production' }
    });

    runningProcesses.set(deploymentId, { process: child, port });

    child.stdout.on('data', (data) => this.log(deploymentId, data.toString().trim(), LogLevel.INFO));
    child.stderr.on('data', (data) => this.log(deploymentId, data.toString().trim(), LogLevel.WARN));

    const healthy = await this.pollHealth(port, 60);
    if (!healthy) {
      child.kill('SIGKILL');
      runningProcesses.delete(deploymentId);
      throw new Error(`Health check failed after wakeup.`);
    }

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { meta: { port } }
    });

    await this.log(deploymentId, `🟢 SUCCESS: Application is back online on port ${port}`, LogLevel.INFO);
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

  static async stopProcess(deploymentId: string) {
    const existing = runningProcesses.get(deploymentId);
    if (existing && existing.process) {
      existing.process.kill('SIGKILL');
      runningProcesses.delete(deploymentId);
      return true;
    }
    return false;
  }

  static getActiveProcessCount(): number {
    return runningProcesses.size;
  }

  private static async pollHealth(port: number, timeoutSeconds: number): Promise<boolean> {
    const start = Date.now();
    const http = require('http');

    return new Promise((resolve) => {
      const check = () => {
        if (Date.now() - start > timeoutSeconds * 1000) {
          logger.warn(`Health check timeout on port ${port}`);
          return resolve(false);
        }

        const req = http.get(`http://localhost:${port}`, (res: any) => {
          // Any response (even 404) means the server is listening
          logger.info(`Health check success on port ${port} (Status: ${res.statusCode})`);
          resolve(true);
        });

        req.on('error', (err: any) => {
          // Only log periodically to avoid spamming
          if (Math.floor((Date.now() - start) / 1000) % 5 === 0) {
            logger.info(`Waiting for application to respond on port ${port}...`);
          }
          setTimeout(check, 2000); // Try again in 2s
        });

        req.end();
      };

      check();
    });
  }
}
