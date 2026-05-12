import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
app.use(cookieParser() as any);
app.set('trust proxy', 1);

// Security & CORS Middlewares
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.set('strict routing', false);
app.set('case sensitive routing', false);
app.use(helmet({
  contentSecurityPolicy: false, 
}));

// Health Check (Now protected by CORS)
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', message: 'DeployFlow API is healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Database disconnected' });
  }
});

app.use(standardRateLimiter);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { ProxyService } from './services/proxyService';

// --- PERMANENT PRODUCTION ROUTER ---
// Routes traffic based on the project slug (e.g. /p/my-app)
app.get('/p/:slug/:subPath(*)?', async (req, res) => {
  const { slug } = req.params;
  return ProxyService.handleRequest(req, res, slug);
});

// --- SUBDOMAIN ROUTER ---
// Routes traffic based on the hostname (e.g. my-app.deployflow.dev)
app.use(async (req, res, next) => {
  const host = req.headers.host || '';
  const baseDomain = 'deployflow.dev'; // Should match your APP_SUBDOMAIN_BASE in .env

  if (host.endsWith(baseDomain) && host !== baseDomain) {
    const slug = host.replace(`.${baseDomain}`, '');
    return ProxyService.handleRequest(req, res, slug);
  }
  next();
});

// --- PROJECT-AWARE LIVE HOSTING ENGINE ---
app.all('/live/:id/:subPath(*)?', async (req, res) => {
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

    // Set sticky cookie for SPA session persistence
    res.cookie('df_last_project', id, { path: '/', maxAge: 24 * 60 * 60 * 1000 }); // 24 hours

    const buildRoot = path.join(process.cwd(), 'temp-builds', deployment.projectId);
    
    // --- SELF-HEALING ENGINE (EPHEMERAL FS RECOVERY) ---
    if (!fs.existsSync(buildRoot)) {
      logger.warn(`Deployment ${id} files missing. Triggering auto-recovery...`);
      BuildService.runBuild(id).catch(err => logger.error('Recovery failed:', err));
      
      return res.status(503).send(`
        <div style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: auto; text-align: center;">
          <h1 style="color: #3b82f6;">Restoring Deployment...</h1>
          <p style="color: #71717a;">The server recently restarted and is currently restoring this project from Git. It will be live again in about 60 seconds.</p>
          <div style="margin-top: 20px; font-size: 14px; color: #a1a1aa;">Please refresh this page shortly.</div>
          <script>setTimeout(() => window.location.reload(), 15000);</script>
        </div>
      `);
    }

    // --- SMART PROCESS RE-LINKING: Recover processes after platform restart ---
    const inMemoryPort = BuildService.getRunningPort(id);
    if (!inMemoryPort && deployment.status === 'READY' && !BuildService.isBuilding(id)) {
      BuildService.runBuild(id).catch(() => {});
      return res.status(502).send(`
        <div style="font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; color: white;">
          <div style="text-align: center; max-width: 500px; padding: 20px;">
            <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px;">System Re-linking...</h1>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">The platform is re-connecting to your project after a system restart. Please wait.</p>
            <script>setTimeout(() => window.location.reload(), 5000);</script>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          </div>
        </div>
      `);
    }

    // 2. Resolve the actual project folder (handling monorepos)
    let projectPath = buildRoot;
    if (deployment.project.rootDirectory && deployment.project.rootDirectory !== './') {
      const cleanRoot = deployment.project.rootDirectory.replace(/^\.\//, '');
      projectPath = path.join(buildRoot, cleanRoot);
    }

    // 3. Define all possible build output folders
    const searchFolders = [
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
      projectPath,
    ];

    const runningPort = inMemoryPort || (deployment.meta as any)?.port;
    const isApiRequest = subPath.startsWith('api/') || subPath.startsWith('v1/') || subPath.includes('graphql');

    // --- SMART FRONTEND PRIORITY (v2) ---
    // If it's NOT an API request, we try to serve it from the frontend first
    if (!isApiRequest) {
      // A. Try direct file matching (e.g. /assets/main.js)
      for (const folder of searchFolders) {
        if (fs.existsSync(folder)) {
          const targetFile = path.join(folder, subPath);
          if (fs.existsSync(targetFile) && !fs.lstatSync(targetFile).isDirectory()) {
            return res.sendFile(targetFile);
          }
        }
      }

      // B. Try SPA index.html fallback for navigation routes
      // We do this if there's no dot in the path (e.g. /dashboard) or if it's the root
      if (!subPath || !subPath.includes('.') || subPath === 'index.html') {
        for (const folder of searchFolders) {
          const indexPath = path.join(folder, 'index.html');
          if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            
            // Inject <base> tag for subpath routing
            const baseTag = `<base href="/live/${id}/">`;
            const transformHtml = (content: string) => {
              let body = content;
              if (/<head>/i.test(body)) body = body.replace(/<head>/i, `<head>\n    ${baseTag}`);
              else if (/<html>/i.test(body)) body = body.replace(/<html>/i, `<html>\n<head>${baseTag}</head>`);
              else body = baseTag + body;
              
              // Path Normalization: Convert root-relative paths to relative paths
              // This prevents the app from escaping to the domain root (e.g. /login -> login)
              body = body.replace(/(src|href)=["']\/(?!live\/)([^"':][^"']*)["']/g, '$1="$2"');
              
              // Handle special Vite/Next paths
              body = body.replace(/["']\/(?!live\/)(@vite|_next|node_modules)\//g, (m) => m.replace('/', ''));
              
              // Auto-Inject API URLs
              const publicUrl = `http://localhost:4000/live/${id}`;
              body = body.replace(/http:\/\/localhost:4000/g, publicUrl);
              body = body.replace(/"\/api\//g, `"${publicUrl}/api/`); // Force absolute API paths
              
              return body;
            };

            res.setHeader('Content-Type', 'text/html');
            return res.send(transformHtml(html));
          }
        }
      }
    }

    // --- REVERSE PROXY FOR BACKENDS ---
    // If it's an API request OR we didn't find a frontend match, proxy to the backend
    if (runningPort) {
      const headers = { ...req.headers, host: 'localhost:' + runningPort };
      delete headers['accept-encoding']; 
      
      const proxyReq = http.request({
        host: 'localhost',
        port: runningPort,
        path: '/' + subPath,
        method: req.method,
        headers
      }, (proxyRes) => {
        // If the backend returns 404, we have ONE LAST CHANCE to find it in frontend
        // (This handles cases where the user's API detection logic missed something)
        if (proxyRes.statusCode === 404 && !isApiRequest) {
          for (const folder of searchFolders) {
            const indexPath = path.join(folder, 'index.html');
            if (fs.existsSync(indexPath)) {
               // ... redundant but safe fallback logic ...
               // (Actually we already did this above, so we can just let the 404 through or try one more time)
            }
          }
        }

        res.writeHead(proxyRes.statusCode || 200, { ...proxyRes.headers, 'X-DeployFlow-Proxied': 'true' });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', async (err) => {
        logger.error('Proxy error:', err);
        if (!BuildService.isBuilding(id)) BuildService.runBuild(id).catch(() => {});
        
        const latestLog = await prisma.buildLog.findFirst({
          where: { deploymentId: id },
          orderBy: { timestamp: 'desc' }
        });
        
        res.status(502).send(`
          <div style="font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; color: white;">
            <div style="text-align: center; max-width: 500px; padding: 20px;">
              <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
              <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px;">Waking Up Backend...</h1>
              <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">The backend process is starting up. Refreshing in a few seconds.</p>
              <script>setTimeout(() => window.location.reload(), 5000);</script>
            </div>
          </div>
        `);
      });

      req.pipe(proxyReq);
      return;
    }


    // --- FINAL FALLBACK (If no backend is running) ---
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

    res.status(404).send(`
      <div style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: auto; text-align: center;">
        <h1 style="color: #ef4444;">Deployment Not Found</h1>
        <p style="color: #71717a;">We couldn't find any frontend assets or a running backend for this route.</p>
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

// --- SMART ASSET & API FALLBACK ---
// If a request (like /assets/main.js or /api/login) 404s, check if it came from a /live/:id page
// and try to serve it or proxy it to that deployment's backend.
app.use(async (req, res, next) => {
  const referer = req.get('Referer');
  if (referer && referer.includes('/live/')) {
    const match = referer.match(/\/live\/([^\/?#]+)/);
    if (match) {
      const id = match[1];
      const subPath = req.path.startsWith('/') ? req.path.substring(1) : req.path;
      
      if (!subPath || subPath === 'index.html') return next();

      const deployment = await prisma.deployment.findUnique({
        where: { id },
        include: { project: true }
      });

      if (deployment) {
        const buildRoot = path.join(process.cwd(), 'temp-builds', deployment.projectId);
        
        // 1. Try serving as a Static File
        const searchFolders = [
          path.join(buildRoot, 'dist'),
          path.join(buildRoot, 'build'),
          path.join(buildRoot, 'public'),
          path.join(buildRoot, 'client', 'dist'),
          path.join(buildRoot, 'frontend', 'dist'),
          buildRoot,
        ];

        for (const folder of searchFolders) {
          const targetFile = path.join(folder, subPath);
          if (fs.existsSync(targetFile) && !fs.lstatSync(targetFile).isDirectory()) {
            return res.sendFile(targetFile);
          }
        }

        // 2. If it's an API call or nothing found, PROXY it to the backend
        const inMemoryPort = BuildService.getRunningPort(id);
        const runningPort = inMemoryPort || (deployment.meta as any)?.port;
        
        if (runningPort) {
          const headers = { ...req.headers, host: 'localhost:' + runningPort };
          delete headers['accept-encoding'];
          
          const proxyReq = http.request({
            host: 'localhost',
            port: runningPort,
            path: '/' + subPath,
            method: req.method,
            headers
          }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, { ...proxyRes.headers, 'X-DeployFlow-Rescued': 'true' });
            proxyRes.pipe(res);
          });
          
          proxyReq.on('error', () => res.status(502).json({ error: 'Backend unreachable' }));
          req.pipe(proxyReq);
          return;
        }
      }
    }
  }
  next();
});

// --- STICKY PROJECT RESCUE ---
// If a user refreshes on an absolute route (e.g. /login) and escapes the /live/:id/ path,
// this middleware uses the sticky cookie to redirect them back into their project.
app.get('/:path(*)', (req, res, next) => {
  const subPath = req.params.path || '';
  const lastProject = req.cookies?.df_last_project;

  // We only rescue GET requests for navigation routes (no dot, not an API)
  if (lastProject && !subPath.includes('.') && !subPath.startsWith('api/') && !subPath.startsWith('live/')) {
    logger.info(`Sticky Rescue: Redirecting escaped path /${subPath} to project ${lastProject}`);
    return res.redirect(`/live/${lastProject}/${subPath}`);
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
