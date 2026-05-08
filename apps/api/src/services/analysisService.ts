import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Framework } from '@prisma/client';
import logger from '../config/logger';

export interface AnalysisResult {
  framework: Framework;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  outputDirectory: string;
  envVars: string[];
  suggestions: string[];
}

export class AnalysisService {
  static async analyzeRepository(repoUrl: string): Promise<AnalysisResult> {
    const analysisId = Math.random().toString(36).substring(7);
    const tempDir = path.join(process.cwd(), 'temp-analysis', analysisId);
    
    try {
      if (!fs.existsSync(path.join(process.cwd(), 'temp-analysis'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp-analysis'), { recursive: true });
      }

      await fsPromises.mkdir(tempDir, { recursive: true });
      const git = simpleGit({ baseDir: tempDir });
      
      logger.info(`🔍 Analyzing repository: ${repoUrl}`);
      await git.clone(repoUrl, '.', ['--depth', '1']);
      
      const result = await this.detectConfig(tempDir);
      result.envVars = await this.detectEnvVars(tempDir);
      
      // Add suggestions based on findings
      this.generateSuggestions(result);
      
      return result;
    } catch (error: any) {
      logger.error('❌ Analysis failed:', error);
      throw new Error(`Failed to analyze repository: ${error.message}`);
    } finally {
      // Cleanup temp directory
      setTimeout(() => {
        fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }, 5000); // Small delay to ensure files are closed
    }
  }

  private static async detectConfig(dir: string): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      framework: Framework.STATIC,
      installCommand: 'npm install',
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      outputDirectory: 'dist',
      envVars: [],
      suggestions: []
    };

    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['next']) {
        result.framework = Framework.NEXTJS;
        result.outputDirectory = '.next';
      } else if (deps['vite']) {
        result.framework = Framework.REACT;
        result.outputDirectory = 'dist';
      } else if (deps['@angular/core']) {
        result.framework = Framework.ANGULAR;
        result.outputDirectory = 'dist';
      } else if (deps['vue']) {
        result.framework = Framework.VUE;
        result.outputDirectory = 'dist';
      } else if (deps['express'] || deps['fastify'] || deps['koa']) {
        result.framework = Framework.EXPRESS;
        result.outputDirectory = './';
      }

      // Check scripts
      if (pkg.scripts) {
        if (pkg.scripts.build) result.buildCommand = 'npm run build';
        if (pkg.scripts.start) result.startCommand = 'npm start';
        else if (pkg.scripts.dev) result.startCommand = 'npm run dev';
      }
    } else if (fs.existsSync(path.join(dir, 'requirements.txt')) || fs.existsSync(path.join(dir, 'main.py'))) {
      result.framework = Framework.FASTAPI;
      result.installCommand = 'pip install -r requirements.txt';
      result.buildCommand = '';
      result.startCommand = 'uvicorn main:app --host 0.0.0.0 --port 8000';
    } else if (fs.existsSync(path.join(dir, 'Dockerfile'))) {
      result.framework = Framework.DOCKER;
      result.buildCommand = 'docker build -t app .';
      result.startCommand = 'docker run app';
    }

    return result;
  }

  private static async detectEnvVars(dir: string): Promise<string[]> {
    const envVars = new Set<string>();
    
    // 1. Check .env.example
    const examplePath = path.join(dir, '.env.example');
    if (fs.existsSync(examplePath)) {
      const content = fs.readFileSync(examplePath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=#\s]+)=/);
        if (match && match[1]) envVars.add(match[1]);
      });
    }

    // 2. Basic file scanning for common env var patterns
    // (Could be expanded later with better regex)
    
    return Array.from(envVars);
  }

  private static generateSuggestions(result: AnalysisResult) {
    if (result.framework === Framework.EXPRESS) {
      result.suggestions.push('We detected a backend framework. Ensure you have set the correct PORT environment variable.');
    }
    
    if (result.envVars.length > 0) {
      result.suggestions.push(`We found ${result.envVars.length} required environment variables in your .env.example file.`);
    }

    if (result.framework === Framework.STATIC) {
      result.suggestions.push('This looks like a static site. We will serve it using our high-performance edge server.');
    }
  }
}
