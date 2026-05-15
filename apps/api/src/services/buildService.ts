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
import { ManagedMongoService } from './managedMongoService';

const runningProcesses = new Map<string, any>(); // deploymentId -> { process, port }
const buildingDeployments = new Set<string>(); // projectId
const projectBuildDirs = new Map<string, string>(); // projectId -> path

export class BuildService {
  private static async cleanupStaleProcesses(projectId: string) {
    // 1. Kill tracked processes
    for (const [id, data] of runningProcesses.entries()) {
      if (data.projectId === projectId) {
        logger.info(`Cleaning up stale process for project ${projectId} (Deployment: ${id})`);
        try { data.process.kill('SIGKILL'); } catch (e) {}
        runningProcesses.delete(id);
      }
    }

    // 2. Windows Deep Cleanup: Kill any process locking the build directory
    if (process.platform === 'win32') {
      const buildDir = path.resolve(process.cwd(), 'temp-builds', projectId);
      const psCmd = `powershell -Command "Get-Process | Where-Object { $_.Path -like '${buildDir.replace(/\\/g, '\\')}*' } | Stop-Process -Force"`;
      try { spawn(psCmd, [], { shell: true }); } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  private static async generateEnv(deployment: any, port: number) {
    const env: any = {
      NODE_ENV: 'production',
      PORT: port.toString(),
      ...Object.fromEntries(deployment.project.envVars.map((v: any) => [v.key, v.value]))
    };

    deployment.project.databases.forEach((db: any) => {
      const type = db.type as string;
      if (type === 'POSTGRES') env.DATABASE_URL = db.connectionString || '';
      if (type === 'REDIS') env.REDIS_URL = db.connectionString || '';
      if (type === 'MONGODB') {
        env.MONGODB_URI = db.connectionString || '';
        env.MONGO_URI = db.connectionString || '';
      }
    });

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const baseUrl = isProduction ? 'https://paas-k7nx.onrender.com' : 'http://localhost:4000';
    const publicUrl = `${baseUrl}/live/${deployment.id}`;
    if (!env.API_URL && !env.BACKEND_URL) {
      env.API_URL = publicUrl;
      env.BACKEND_URL = publicUrl;
      env.NEXT_PUBLIC_API_URL = publicUrl;
      env.VITE_API_BASE = publicUrl;
      env.VITE_API_URL = publicUrl;
    }

    return env;
  }

  private static async startRuntime(deploymentId: string, deployment: any, workingDir: string) {
    const port = await this.findAvailablePort();
    const env = await this.generateEnv(deployment, port);
    
    const localBin = path.join(workingDir, 'node_modules', '.bin');
    env.PATH = `${localBin}${path.delimiter}${process.env.PATH}`;
    env.Path = env.PATH;
    env.HOME = workingDir;

    // --- MONOREPO START DELEGATION ---
    let startCommand = 'npm start';
    const pkgPath = path.join(workingDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts?.start) startCommand = 'npm start';
      else if (pkg.scripts?.dev) startCommand = 'npm run dev';
    }

    let finalStartCommand = startCommand;
    const subfolders = ['backend', 'api', 'server', 'web'];
    for (const f of subfolders) {
      const sP = path.join(workingDir, f);
      if (fs.existsSync(path.join(sP, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(sP, 'package.json'), 'utf8'));
        if (pkg.scripts?.start || pkg.scripts?.dev) {
          const subCmd = pkg.scripts?.start ? 'start' : 'run dev';
          finalStartCommand = `npm ${subCmd} --prefix ${f}`;
          await this.log(deploymentId, `🚀 Monorepo: Starting '${f}' via root prefix.`, LogLevel.INFO);
          break;
        }
      }
    }

    const staticFrameworks: Framework[] = [Framework.REACT, Framework.VUE, Framework.SVELTE, Framework.ANGULAR, Framework.STATIC, Framework.ASTRO];
    const items = fs.existsSync(workingDir) ? fs.readdirSync(workingDir) : [];
    const isStatic = staticFrameworks.includes(deployment.project.framework) && !items.includes('backend') && !items.includes('api');

    if (isStatic) {
      await this.log(deploymentId, `📦 Static project detected. Serving via Optimized Edge CDN.`, LogLevel.INFO);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { meta: { ...(deployment.meta as any || {}), port: null } }
      });
    } else {
      // --- NUCLEAR ENV INJECTION: Override project's local .env ---
      const envLines = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n');
      fs.writeFileSync(path.join(workingDir, '.env'), envLines);

      await this.log(deploymentId, `[4/4] 🚀 Starting backend process...`, LogLevel.INFO);
      await this.executeBackendProcess(deploymentId, deployment, workingDir, env, finalStartCommand, port);
    }
  }

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

    this.runBuild(deployment.id).catch(e => {
      logger.error(`Immediate build start failed:`, e);
      this.log(deployment.id, `❌ Failed to start build: ${e.message}`, LogLevel.ERROR);
    });
    
    return deployment;
  }

  static async runBuild(deploymentId: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: { include: { envVars: true, databases: true } } },
    });

    if (!deployment) return;

    // Use a professional, isolated build path
    const isRender = process.env.RENDER === 'true';
    const baseTempDir = isRender ? '/tmp' : path.join(process.cwd(), 'temp-builds');
    const rootBuildDir = path.join(baseTempDir, 'deployflow-work');
    const buildDir = path.join(rootBuildDir, deployment.projectId);
    
    const isRecovery = deployment.status === DeploymentStatus.READY;
    
    if (isRecovery && fs.existsSync(buildDir)) {
      await this.log(deploymentId, `⚡ Instant Recovery: Project artifacts found. Skipping build...`, LogLevel.INFO);
      await this.cleanupStaleProcesses(deployment.projectId);
      try {
        await this.startRuntime(deploymentId, deployment, buildDir);
        return;
      } catch (err) {
        await this.log(deploymentId, `⚠️ Instant Start failed, falling back to full rebuild...`, LogLevel.WARN);
      }
    }

    // ENSURE CLEAN START: Real platforms always start from a clean state
    await this.cleanupStaleProcesses(deployment.projectId);
    if (fs.existsSync(buildDir)) {
      try {
        await fsPromises.rm(buildDir, { recursive: true, force: true });
        await this.log(deploymentId, `🧹 Cleaned up previous build artifacts.`, LogLevel.INFO);
      } catch (e) {}
    }

    if (buildingDeployments.has(deployment.projectId)) {
      await this.log(deploymentId, `⏳ A build is already active for this project. This usually happens during auto-recovery. We will wait for it to finish...`, LogLevel.WARN);
      let waitTime = 0;
      while (buildingDeployments.has(deployment.projectId) && waitTime < 120) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        waitTime += 2;
        const latest = await prisma.deployment.findFirst({
          where: { projectId: deployment.projectId, status: DeploymentStatus.READY },
          orderBy: { createdAt: 'desc' }
        });
        if (latest && latest.createdAt > deployment.createdAt) {
          await this.log(deploymentId, `✅ Another build finished successfully while waiting. Skipping redundant build.`, LogLevel.INFO);
          await prisma.deployment.update({ where: { id: deploymentId }, data: { status: DeploymentStatus.READY, url: latest.url } });
          return;
        }
      }
      if (buildingDeployments.has(deployment.projectId)) {
        await this.log(deploymentId, `⚠️ Previous build is taking too long. Forcing lock release...`, LogLevel.WARN);
        buildingDeployments.delete(deployment.projectId);
      }
    }
    
    buildingDeployments.add(deployment.projectId);
    
    try {
      await this.log(deploymentId, `🔍 System Check: Platform=${process.platform}, CWD=${process.cwd()}, User=${process.env.USER || 'unknown'}`, LogLevel.INFO);
      
      if (process.platform === 'win32') await new Promise(resolve => setTimeout(resolve, 2000));

      await prisma.deployment.update({ where: { id: deploymentId }, data: { status: DeploymentStatus.BUILDING } });
      await this.log(deploymentId, `[1/4] 📥 Fetching updates...`, LogLevel.INFO);
      
      try {
        if (!fs.existsSync(rootBuildDir)) {
          await fsPromises.mkdir(rootBuildDir, { recursive: true });
        }
        await fsPromises.mkdir(buildDir, { recursive: true });
      } catch (e: any) {
        throw new Error(`Failed to create build workspace: ${e.message}`);
      }

      if (!deployment.project.repoUrl) throw new Error('No GitHub repository URL provided.');

      const git = simpleGit();
      
      // Verify environment
      try {
        await git.version();
      } catch (e) {
        throw new Error('System environment error: Git not found. Please contact support.');
      }

      await this.log(deploymentId, `  ↳ Cloning repository from GitHub...`, LogLevel.INFO);
      try {
        await git.clone(deployment.project.repoUrl, buildDir, ['--depth', '1']);
        await this.log(deploymentId, `  ↳ Clone complete.`, LogLevel.INFO);
      } catch (e: any) {
        throw new Error(`Failed to clone repository: ${e.message}`);
      }

      const port = await this.findAvailablePort();
      const env = await this.generateEnv(deployment, port);
      env.NODE_ENV = 'development';

      // Resolve working directory (respects rootDirectory setting)
      let workingDir = buildDir;
      if (deployment.project.rootDirectory && !['./', '/', ''].includes(deployment.project.rootDirectory.trim())) {
        const candidate = path.join(buildDir, deployment.project.rootDirectory.replace(/^[\/\\]+/, '').replace(/^\.\//,  ''));
        if (fs.existsSync(candidate)) {
          workingDir = candidate;
          await this.log(deploymentId, `  ↳ Root directory resolved: ${workingDir}`, LogLevel.INFO);
        } else {
          await this.log(deploymentId, `⚠️ Root directory '${deployment.project.rootDirectory}' not found in repo — falling back to repo root.`, LogLevel.WARN);
        }
      }

      const pkgPath = path.join(workingDir, 'package.json');

      const syncPath = (dir: string) => {
        env.PATH = `${path.join(dir, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`;
        env.Path = env.PATH;
        env.HOME = dir;
      };
      syncPath(workingDir);

      // Install
      const isStaticNoPackage = deployment.project.framework === Framework.STATIC && !fs.existsSync(pkgPath);

      if (isStaticNoPackage) {
        await this.log(deploymentId, `[2/4] ⏩ Static site with no package.json detected. Skipping install & build.`, LogLevel.INFO);
      } else if (fs.existsSync(pkgPath)) {
        await this.log(deploymentId, `[2/4] 📦 Synchronizing dependencies...`, LogLevel.INFO);
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const isMonorepo = !!pkg.workspaces;
        const installCmd = (isMonorepo || !fs.existsSync(path.join(workingDir, 'package-lock.json'))) ? 'install' : 'ci';
        try {
          await this.executeLiveCommand(deploymentId, 'npm', [installCmd, '--prefer-offline', '--no-audit', '--no-fund'], workingDir, env, 1200000);
        } catch (err) {
          await this.log(deploymentId, `⚠️ Initial sync failed (lock). Retrying with Deep Cleanup...`, LogLevel.WARN);
          await this.cleanupStaleProcesses(deployment.projectId);
          await this.executeLiveCommand(deploymentId, 'npm', [installCmd, '--prefer-offline', '--no-audit', '--no-fund'], workingDir, env, 1200000);
        }
      } else {
        await this.log(deploymentId, `[2/4] ⏩ No package.json found. Skipping dependencies sync.`, LogLevel.INFO);
      }

      // Subfolders
      const subfolders = ['backend', 'frontend', 'api', 'web', 'client', 'server'];
      const detected: string[] = [];
      for (const folder of subfolders) {
        const subPath = path.join(workingDir, folder);
        if (fs.existsSync(path.join(subPath, 'package.json'))) {
          detected.push(folder);
          await this.log(deploymentId, `📦 Subfolder '${folder}' detected. Synchronizing...`, LogLevel.INFO);
          try {
            await this.executeLiveCommand(deploymentId, 'npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--no-package-lock'], subPath, env, 600000);
            
            // --- RECURSIVE BUILD: Ensure subfolders are also built ---
            const subPkg = JSON.parse(fs.readFileSync(path.join(subPath, 'package.json'), 'utf8'));
            if (subPkg.scripts?.build) {
              await this.log(deploymentId, `🔨 Building subfolder '${folder}'...`, LogLevel.INFO);
              await this.executeLiveCommand(deploymentId, 'npm run build', [], subPath, env, 600000);
            }
          } catch (e) {
            await this.cleanupStaleProcesses(deployment.projectId);
            await this.executeLiveCommand(deploymentId, 'npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--no-package-lock'], subPath, env, 600000);
          }
        }
      }

      // --- UNIVERSAL RELATIVE FIX: Make project path-agnostic ---
      const livePath = './'; 
      env.VITE_BASE_URL = livePath;
      env.BASE_URL = livePath;
      env.PUBLIC_URL = livePath;
      env.VITE_BASE_PATH = livePath; 
      
      const rootPkgPath = path.join(workingDir, 'package.json');
      const rootPkg = fs.existsSync(rootPkgPath) ? JSON.parse(fs.readFileSync(rootPkgPath, 'utf8')) : {};
      if (!isStaticNoPackage && (rootPkg.scripts?.build || deployment.project.buildCommand)) {
        await this.log(deploymentId, `[3/4] 🔨 Building project...`, LogLevel.INFO);
        let bCmd = deployment.project.buildCommand || 'npm run build';
        
        // --- DYNAMIC BASE PATH INJECTION ---
        // Ensures that assets are requested with the correct /live/:id/ prefix
        const basePath = `/live/${deploymentId}/`;
        
        if (bCmd.includes('vite build') || bCmd === 'npm run build') {
          bCmd += ` -- --base=${basePath}`;
        }

        env.VITE_BASE_URL = basePath;
        env.BASE_URL = basePath;
        env.PUBLIC_URL = basePath;
        env.VITE_BASE_PATH = basePath;

        try {
          await this.executeLiveCommand(deploymentId, bCmd, [], workingDir, env, 1200000);
        } catch (err) {
          await this.log(deploymentId, `⚠️ Root build failed. Continuing to subfolders...`, LogLevel.WARN);
        }

        // --- RECURSIVE MONOREPO BUILD: Always build subfolders if they exist ---
        const subfolders = fs.readdirSync(workingDir).filter(f => 
          fs.lstatSync(path.join(workingDir, f)).isDirectory() && 
          fs.existsSync(path.join(workingDir, f, 'package.json')) &&
          f !== 'node_modules'
        );

        for (const folder of subfolders) {
          const folderPath = path.join(workingDir, folder);
          const pkg = JSON.parse(fs.readFileSync(path.join(folderPath, 'package.json'), 'utf8'));
          if (pkg.scripts?.build) {
            await this.log(deploymentId, `🔨 Building detected sub-project: '${folder}'...`, LogLevel.INFO);
            try {
              await this.executeLiveCommand(deploymentId, 'npm run build', [], folderPath, env, 600000);
            } catch (e) {
              await this.log(deploymentId, `⚠️ Build failed for '${folder}', skipping...`, LogLevel.WARN);
            }
          }
        }
      } else {
        await this.log(deploymentId, `[3/4] ⏩ No build script found. Skipping build phase.`, LogLevel.INFO);
      }

      const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
      const baseUrl = isProduction ? 'https://paas-k7nx.onrender.com' : 'http://localhost:4000';
      const projectUrl = `${baseUrl}/live/${deploymentId}/`;
      await this.startRuntime(deploymentId, deployment, workingDir);

      // --- FINAL HARDENING: Post-Build Health Guard with Grace Period ---
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const assetFolders = ['dist', 'build', 'out', 'output', 'public', 'frontend/dist', 'frontend/build', 'web/dist', 'web/build'];
      let foundFolder = '';
      
      for (const folder of assetFolders) {
        const p = path.join(workingDir, folder);
        if (fs.existsSync(p)) {
          const files = fs.readdirSync(p);
          if (files.length > 0) {
            foundFolder = folder;
            break;
          }
        }
      }
      
      const isAlive = BuildService.isProcessRunning(deploymentId);
      const isStatic = ['REACT', 'STATIC', 'ASTRO', 'VUE', 'SVELTE', 'ANGULAR', 'NEXTJS'].includes(deployment.project.framework) || !!foundFolder;
      
      if (!foundFolder && !isAlive && !isStatic) {
        // Log directory structure to help debug
        try {
          const files = fs.readdirSync(workingDir);
          await this.log(deploymentId, `❌ Health Check Failed. Contents of ${workingDir}: ${files.join(', ')}`, LogLevel.ERROR);
        } catch (e) {}
        throw new Error(`Deployment Health Check Failed: No output assets found in (${assetFolders.join(', ')}) and no backend process is running.`);
      }

      if (foundFolder) {
        await this.log(deploymentId, `✅ Assets verified in /${foundFolder}`, LogLevel.INFO);
      }
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          status: DeploymentStatus.READY,
          readyAt: new Date(),
          url: projectUrl,
          meta: {
            ...(deployment.meta as any || {}),
            staticFolder: foundFolder || null
          }
        }
      });

      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.READY);
      await this.log(deploymentId, `✨ SUCCESS! Health check passed. Live at: ${projectUrl}`, LogLevel.INFO);

    } catch (error: any) {
      const friendly = this.translateError(error.message);
      await prisma.deployment.update({ where: { id: deploymentId }, data: { status: DeploymentStatus.ERROR, errorMessage: friendly } });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:status', DeploymentStatus.ERROR);
      await this.log(deploymentId, `❌ FAILED: ${friendly}`, LogLevel.ERROR);
    } finally {
      buildingDeployments.delete(deployment.projectId);
    }
  }

  static async cleanupStuckBuilds() {
    try {
      await prisma.deployment.updateMany({
        where: { status: { in: [DeploymentStatus.QUEUED, DeploymentStatus.BUILDING] } },
        data: { status: DeploymentStatus.ERROR },
      });
    } catch (e) {}
  }

  static isBuilding(projectId: string) { return buildingDeployments.has(projectId); }
  static isProcessRunning(id: string) { return runningProcesses.has(id); }
  static getRunningPort(id: string) { return runningProcesses.get(id)?.port; }
  static async stopProcess(id: string) { const p = runningProcesses.get(id); if (p) { p.process.kill('SIGKILL'); runningProcesses.delete(id); } }

  /**
   * Ensures that a specific deployment process is running.
   * If not, it triggers a recovery start.
   */
  static async ensureRunning(deploymentId: string) {
    if (!this.isProcessRunning(deploymentId)) {
      logger.info(`Ensuring deployment ${deploymentId} is running...`);
      return this.runBuild(deploymentId);
    }
  }

  private static async findAvailablePort(): Promise<number> {
    const usedPorts = Array.from(runningProcesses.values()).map(p => p.port);
    let port = 10000;
    while (usedPorts.includes(port)) port++;
    if (process.platform === 'win32') await this.cleanupPort(port);
    return port;
  }

  private static async cleanupPort(port: number): Promise<void> {
    return new Promise((resolve) => {
      const child = spawn(`netstat -ano | findstr :${port}`, [], { shell: true });
      let output = '';
      child.stdout.on('data', d => output += d.toString());
      child.on('close', async () => {
        const pids = output.split('\n').filter(l => l.includes('LISTENING')).map(l => l.trim().split(/\s+/).pop());
        for (const pid of pids) if (pid && pid !== '0') try { spawn(`taskkill /F /PID ${pid}`, [], { shell: true }); } catch (e) {}
        setTimeout(resolve, 1000);
      });
    });
  }

  private static async executeBackendProcess(deploymentId: string, deployment: any, cwd: string, env: any, startCommand: string, port: number) {
    if (process.platform === 'win32') await this.cleanupPort(port);
    const mongoUri = env.MONGODB_URI || env.MONGO_URI;
    if (mongoUri && mongoUri.includes('127.0.0.1')) await ManagedMongoService.getOrCreateServer(deployment.projectId);
    const child = spawn(startCommand, [], { cwd, shell: true, env: { ...process.env, ...env, PORT: port.toString() } });
    runningProcesses.set(deploymentId, { process: child, port, projectId: deployment.projectId });
    child.stdout.on('data', data => this.log(deploymentId, `[Runtime] ${data.toString().trim()}`, LogLevel.INFO));
    child.stderr.on('data', data => this.log(deploymentId, `[Runtime Error] ${data.toString().trim()}`, LogLevel.WARN));
    child.on('close', code => {
      this.log(deploymentId, `Backend process exited with code ${code}`, LogLevel.WARN);
      runningProcesses.delete(deploymentId);
    });
  }

  static async log(deploymentId: string, content: string, level: LogLevel) {
    try {
      const log = await prisma.buildLog.create({ data: { deploymentId, message: content, level, timestamp: new Date() } });
      getIO().to(`deployment:${deploymentId}`).emit('deployment:log', { ...log, message: content });
    } catch (e) {}
  }

  private static translateError(error: string): string {
    if (error.includes('128') || error.includes('not found')) return 'Repository not found. Ensure it is public.';
    // Removed generic ENOENT translation to show real paths in logs
    return error;
  }

  private static async executeLiveCommand(deploymentId: string, command: string, args: string[], cwd: string, env: any, timeoutMs: number) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, shell: true, env: { ...process.env, ...env } });
      const t = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Timeout')); }, timeoutMs);
      child.stdout.on('data', d => d.toString().split('\n').forEach((l: string) => l.trim() && this.log(deploymentId, l.trim(), LogLevel.INFO)));
      child.stderr.on('data', d => d.toString().split('\n').forEach((l: string) => l.trim() && this.log(deploymentId, l.trim(), LogLevel.WARN)));
      child.on('close', c => { clearTimeout(t); c === 0 ? resolve(true) : reject(new Error(`Exit ${c}`)); });
    });
  }
}
