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

      // Shallow clone with timeout to avoid hanging on private repos
      const git = simpleGit();
      await Promise.race([
        git.clone(repoUrl, tempDir, ['--depth', '1']),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Analysis timeout: Repository may be private or too large')), 15000))
      ]);


      const result: AnalysisResult = {
        framework: Framework.STATIC,
        hasFrontend: false,
        hasBackend: false,
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        rootDirectory: './',
        requiredEnvVars: [],
        detectedEnv: {}, // Initialize empty
        databaseRequired: 'NONE'
      };

      // 1. Recursive Directory Discovery (Monorepo Support)
      const allFiles = await fsPromises.readdir(tempDir, { recursive: true });
      const pkgFiles = allFiles.filter(f => f.toString().endsWith('package.json'));
      
      let primaryPkgPath = path.join(tempDir, 'package.json');
      if (!fs.existsSync(primaryPkgPath) && pkgFiles.length > 0) {
        // If no root package.json, find the most likely one (e.g. in frontend/ or apps/)
        const bestCandidate = pkgFiles.find(f => f.toString().includes('frontend') || f.toString().includes('web') || f.toString().includes('app')) || pkgFiles[0];
        primaryPkgPath = path.join(tempDir, bestCandidate.toString());
        result.rootDirectory = './' + path.dirname(bestCandidate.toString()).replace(/\\/g, '/');
      }

      // 2. Scan primary package.json
      if (fs.existsSync(primaryPkgPath)) {
        const pkg = JSON.parse(await fsPromises.readFile(primaryPkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.next) result.framework = Framework.NEXTJS;
        else if (deps.vite || deps['@vitejs/plugin-react']) result.framework = Framework.REACT;
        else if (deps.express) result.framework = Framework.EXPRESS;
        else if (deps['@angular/core']) result.framework = Framework.ANGULAR;
        else if (deps.vue) result.framework = Framework.VUE;

        // Auto-detect commands
        if (pkg.scripts?.build) result.buildCommand = 'npm run build';
        else if (pkg.scripts?.compile) result.buildCommand = 'npm run compile';
        
        if (pkg.scripts?.start) result.startCommand = 'npm start';
        else if (pkg.scripts?.dev) result.startCommand = 'npm run dev';

        // Deep Database Detection in deps
        if (deps.mongoose || deps.mongodb || deps['mongodb-client-encryption']) result.databaseRequired = 'MONGODB';
        else if (deps.pg || deps.prisma || deps.sequelize) result.databaseRequired = 'POSTGRES';
        else if (deps.redis || deps.ioredis) result.databaseRequired = 'REDIS';
      }

      // 3. Deep Code Scanning for Database Patterns (Fallback)
      if (result.databaseRequired === 'NONE') {
        const contentSample = await this.scanForPatterns(tempDir, [
          /MongoClient/i, /mongoose\.connect/i, /PrismaClient/i, /createClient.*redis/i
        ]);
        if (contentSample.mongo) result.databaseRequired = 'MONGODB';
        else if (contentSample.prisma || contentSample.pg) result.databaseRequired = 'POSTGRES';
        else if (contentSample.redis) result.databaseRequired = 'REDIS';
      }

      // 4. Scan for required ENV vars
      await this.scanForEnvVars(tempDir, result.requiredEnvVars);

      // Filter out System-Managed variables (we will auto-inject these)
      const systemManaged = ['BACKEND_URL', 'API_URL', 'NEXT_PUBLIC_API_URL', 'VITE_API_BASE', 'PORT', 'DATABASE_URL', 'MONGODB_URI', 'REDIS_URL'];
      result.requiredEnvVars = result.requiredEnvVars.filter(v => !systemManaged.includes(v));

      // 5. Detect and Parse .env files
      const envFiles = ['.env', '.env.local', '.env.production', '.env.development', '.env.example'];
      for (const envFile of envFiles) {
        const envPath = path.join(tempDir, envFile);
        if (fs.existsSync(envPath)) {
          const content = await fsPromises.readFile(envPath, 'utf8');
          content.split('\n').forEach(line => {
            const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (match) {
              const key = match[1];
              const value = match[2].replace(/['"]/g, '').trim();
              if (key && value && !systemManaged.includes(key)) {
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

  private static async scanForPatterns(dir: string, patterns: RegExp[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = { mongo: false, prisma: false, pg: false, redis: false };
    const files = await fsPromises.readdir(dir, { recursive: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file as string);
      const stat = await fsPromises.stat(fullPath).catch(() => null);
      if (!stat || !stat.isFile() || !file.toString().match(/\.(js|ts|tsx|jsx|env|json|yml|yaml)$/)) continue;

      const content = await fsPromises.readFile(fullPath, 'utf8');
      if (patterns[0].test(content)) results.mongo = true;
      if (patterns[1].test(content)) results.mongo = true;
      if (patterns[2].test(content)) results.prisma = true;
      if (patterns[3].test(content)) results.redis = true;
    }
    return results;
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
