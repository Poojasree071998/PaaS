import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Framework } from '@prisma/client';

export interface AnalysisResult {
  framework: Framework;
  hasFrontend: boolean;
  hasBackend: boolean;
  buildCommand: string;
  startCommand: string;
  rootDirectory: string;
  requiredEnvVars: string[];
  detectedEnv: Record<string, string>; // Added to store key-value pairs from .env
  databaseRequired: 'MONGODB' | 'POSTGRES' | 'REDIS' | 'NONE';
}

export class AnalysisService {
  static async analyzeRepository(repoUrl: string): Promise<AnalysisResult> {
    const tempDir = path.join(process.cwd(), 'temp-analysis', Math.random().toString(36).slice(7));
    
    try {
      if (!fs.existsSync(tempDir)) await fsPromises.mkdir(tempDir, { recursive: true });

      // Shallow clone to analyze structure
      const git = simpleGit();
      await git.clone(repoUrl, tempDir, ['--depth', '1']);

      const result: AnalysisResult = {
        framework: Framework.STATIC,
        hasFrontend: false,
        hasBackend: false,
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        rootDirectory: '/',
        requiredEnvVars: [],
        detectedEnv: {}, // Initialize empty
        databaseRequired: 'NONE'
      };

      // 1. Detect Folders
      result.hasFrontend = fs.existsSync(path.join(tempDir, 'frontend')) || fs.existsSync(path.join(tempDir, 'client'));
      result.hasBackend = fs.existsSync(path.join(tempDir, 'backend')) || fs.existsSync(path.join(tempDir, 'server'));

      // 2. Scan package.json
      const pkgPath = fs.existsSync(path.join(tempDir, 'package.json')) 
        ? path.join(tempDir, 'package.json')
        : result.hasFrontend ? path.join(tempDir, 'frontend', 'package.json') : null;

      if (pkgPath && fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(await fsPromises.readFile(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.next) result.framework = Framework.NEXTJS;
        else if (deps.vite) result.framework = Framework.REACT;
        else if (deps.express) result.framework = Framework.EXPRESS;

        // Auto-detect commands
        if (pkg.scripts?.build) result.buildCommand = 'npm run build';
        if (pkg.scripts?.start) result.startCommand = 'npm start';

        // Detect Database Needs
        if (deps.mongoose || deps.mongodb) result.databaseRequired = 'MONGODB';
        else if (deps.pg || deps.prisma) result.databaseRequired = 'POSTGRES';
        else if (deps.redis) result.databaseRequired = 'REDIS';
      }

      // 3. Scan for required ENV vars
      await this.scanForEnvVars(tempDir, result.requiredEnvVars);

      // Filter out System-Managed variables (we will auto-inject these)
      const systemManaged = ['BACKEND_URL', 'API_URL', 'NEXT_PUBLIC_API_URL', 'VITE_API_BASE'];
      result.requiredEnvVars = result.requiredEnvVars.filter(v => !systemManaged.includes(v));

      // 5. Detect and Parse .env files
      const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
      for (const envFile of envFiles) {
        const envPath = path.join(tempDir, envFile);
        if (fs.existsSync(envPath)) {
          const content = await fsPromises.readFile(envPath, 'utf8');
          content.split('\n').forEach(line => {
            const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (match) {
              const key = match[1];
              const value = match[2].replace(/['"]/g, '').trim();
              if (key && value) {
                result.detectedEnv[key] = value;
                if (!result.requiredEnvVars.includes(key)) result.requiredEnvVars.push(key);
              }
            }
          });
        }
      }

      return result;
    } finally {
      // Cleanup
      await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private static async scanForEnvVars(dir: string, foundVars: string[]) {
    const files = await fsPromises.readdir(dir, { recursive: true });
    const envRegex = /process\.env\.([A-Z0-9_]+)/g;

    for (const file of files) {
      const fullPath = path.join(dir, file as string);
      const stat = await fsPromises.stat(fullPath).catch(() => null);
      if (!stat || !stat.isFile() || !file.toString().match(/\.(js|ts|tsx|jsx)$/)) continue;

      const content = await fsPromises.readFile(fullPath, 'utf8');
      let match;
      while ((match = envRegex.exec(content)) !== null) {
        if (!foundVars.includes(match[1])) foundVars.push(match[1]);
      }
    }
  }
}
