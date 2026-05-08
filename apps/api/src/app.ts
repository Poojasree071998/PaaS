import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { BuildService } from './services/buildService';
import { errorHandler } from './middlewares/errorHandler';
import { standardRateLimiter } from './middlewares/rateLimiter';
import logger from './config/logger';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import prisma from './config/prisma';

import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import projectRoutes from './routes/projectRoutes';
import deploymentRoutes from './routes/deploymentRoutes';
import envRoutes from './routes/envRoutes';
import domainRoutes from './routes/domainRoutes';
import webhookRoutes from './routes/webhookRoutes';
import tokenRoutes from './routes/tokenRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import databaseRoutes from './routes/databaseRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

// Security Middlewares
app.set('strict routing', false);
app.set('case sensitive routing', false);
app.use(helmet({
  contentSecurityPolicy: false, 
}));
app.use(cors());
app.use(standardRateLimiter);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- PROJECT-AWARE LIVE HOSTING ENGINE ---
app.get('/live/:id/:subPath(*)?', async (req, res) => {
  const { id } = req.params;
  const subPath = (req.params as any).subPath || '';
  
  try {
    // 1. Fetch deployment and project info to find the correct Root Directory
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!deployment) {
      return res.status(404).send('<h1>Deployment record not found</h1>');
    }

    // --- REVERSE PROXY FOR BACKENDS ---
    const runningPort = (deployment.meta as any)?.port || BuildService.getRunningPort(id);
    if (runningPort) {
      const proxyReq = http.request({
        host: 'localhost',
        port: runningPort,
        path: '/' + subPath,
        method: req.method,
        headers: { ...req.headers, host: 'localhost:' + runningPort }
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, {
          ...proxyRes.headers,
          'X-DeployFlow-Proxied': 'true'
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        logger.error('Proxy error:', err);
        res.status(502).send('<h1>Bad Gateway</h1><p>The backend process is not responding.</p>');
      });

      req.pipe(proxyReq);
      return;
    }

    const buildRoot = path.join(process.cwd(), 'temp-builds', id);
    if (!fs.existsSync(buildRoot)) {
      return res.status(404).send('<h1>Deployment files missing</h1><p>The build files for this deployment are no longer available on this server.</p>');
    }

    // 2. Resolve the actual project folder (handling monorepos)
    let projectPath = buildRoot;
    if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
      const cleanRoot = deployment.project.rootDirectory.replace(/^\.\//, '');
      projectPath = path.join(buildRoot, cleanRoot);
    }

    // 3. Smart Detection of build output folders inside the project path
    const searchFolders = [
      projectPath,
      path.join(projectPath, 'dist'),
      path.join(projectPath, 'build'),
      path.join(projectPath, 'public'),
      path.join(projectPath, 'out'),
      path.join(projectPath, 'client', 'dist'),
      path.join(projectPath, 'client', 'build'),
      path.join(projectPath, 'frontend', 'dist'),
      path.join(projectPath, 'frontend', 'build'),
      path.join(projectPath, 'web', 'dist'),
      path.join(projectPath, 'apps', 'web', 'dist'),
    ];

    for (const folder of searchFolders) {
      if (fs.existsSync(folder)) {
        const targetFile = path.join(folder, subPath);
        
        if (fs.existsSync(targetFile)) {
          if (fs.lstatSync(targetFile).isDirectory()) {
            const index = path.join(targetFile, 'index.html');
            if (fs.existsSync(index)) return res.sendFile(index);
          } else {
            return res.sendFile(targetFile);
          }
        }
      }
    }

    // 4. Fallback to index.html in any valid folder (SPA Routing)
    for (const folder of searchFolders) {
      const index = path.join(folder, 'index.html');
      if (fs.existsSync(index)) {
        // INJECT <base> tag to fix subpath routing issues
        let html = fs.readFileSync(index, 'utf8');
        const baseTag = `<base href="/live/${id}/">`;
        
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>\n    ${baseTag}`);
        } else if (html.includes('<html>')) {
          html = html.replace('<html>', `<html>\n<head>${baseTag}</head>`);
        } else {
          html = baseTag + html;
        }
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
    }

    // --- SPA CATCH-ALL ---
    // If we are here, it means it's a deep-link for an SPA (e.g. /live/id/dashboard)
    // We should try to serve the root index.html
    for (const folder of [projectPath, path.join(projectPath, 'dist'), path.join(projectPath, 'build'), path.join(projectPath, 'public')]) {
      const index = path.join(folder, 'index.html');
      if (fs.existsSync(index)) {
        let html = fs.readFileSync(index, 'utf8');
        const baseTag = `<base href="/live/${id}/">`;
        html = html.replace('<head>', `<head>\n    ${baseTag}`);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
    }

    res.status(404).send(`
      <div style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: auto; text-align: center;">
        <h1 style="color: #ef4444;">Project Entry Point Not Found</h1>
        <p style="color: #71717a;">We looked in your root and build folders (dist, build, public), but couldn't find an index.html file.</p>
        <div style="background: #f4f4f5; padding: 20px; border-radius: 12px; text-align: left; font-family: monospace; font-size: 13px;">
          <strong>Looked in:</strong><br/>
          ${searchFolders.map(f => f.split('temp-builds')[1] || f).join('<br/>')}
        </div>
        <p style="margin-top: 20px; font-size: 14px;">Tip: Ensure your project has an index.html or that you've set the correct <strong>Root Directory</strong>.</p>
      </div>
    `);

  } catch (error) {
    logger.error('Hosting error:', error);
    res.status(500).send('Internal Server Error during hosting.');
  }
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'UP' });
});

// Routes
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'DeployFlow API', version: '1.0.0' },
  },
  apis: ['./src/routes/*.ts'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve as any, swaggerUi.setup(swaggerDocs) as any);

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/env', envRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// --- SMART ASSET FALLBACK ---
// If a request (like /assets/main.js) 404s, check if it came from a /live/:id page
// and try to serve it from that deployment's folder.
app.use(async (req, res, next) => {
  const referer = req.get('Referer');
  if (referer && referer.includes('/live/')) {
    const match = referer.match(/\/live\/([^\/?#]+)/);
    if (match) {
      const id = match[1];
      const subPath = req.path.startsWith('/') ? req.path.substring(1) : req.path;
      
      // We don't want to infinite loop or serve index.html here
      if (!subPath || subPath === 'index.html') return next();

      const buildRoot = path.join(process.cwd(), 'temp-builds', id);
      if (fs.existsSync(buildRoot)) {
        // Try all common search folders for this ID
        const searchFolders = [
          buildRoot,
          path.join(buildRoot, 'dist'),
          path.join(buildRoot, 'build'),
          path.join(buildRoot, 'public'),
          path.join(buildRoot, 'client', 'dist'),
          path.join(buildRoot, 'frontend', 'dist'),
        ];

        for (const folder of searchFolders) {
          const targetFile = path.join(folder, subPath);
          if (fs.existsSync(targetFile) && !fs.lstatSync(targetFile).isDirectory()) {
            return res.sendFile(targetFile);
          }
        }
      }
    }
  }
  next();
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
