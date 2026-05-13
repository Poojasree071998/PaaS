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
  referrerPolicy: { policy: 'no-referrer-when-downgrade' }
}));

// Enhanced Health Check
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  const status = dbStatus === 'connected' ? 'OK' : 'DEGRADED';
  res.status(status === 'OK' ? 200 : 207).json({ 
    status, 
    message: status === 'OK' ? 'DeployFlow API is fully operational' : 'API is up but database is unreachable',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Friendly Root Route
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #09090b; color: white; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
      <h1 style="color: #3b82f6; margin-bottom: 8px;">DeployFlow PaaS API</h1>
      <p style="color: #a1a1aa; margin-bottom: 24px;">The hosting engine is active and ready.</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <a href="/health" style="padding: 8px 16px; background: #27272a; color: white; border-radius: 6px; text-decoration: none;">Check Health</a>
        <a href="/api/docs" style="padding: 8px 16px; background: #27272a; color: white; border-radius: 6px; text-decoration: none;">API Docs</a>
      </div>
    </div>
  `);
});

app.use(standardRateLimiter);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ROUTES (Prioritized) ---
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

import { ProxyService } from './services/proxyService';

// --- PERMANENT PRODUCTION ROUTER ---
// Routes traffic based on the project slug (e.g. /p/my-app)
app.get('/p/:slug/:subPath(*)?', async (req, res) => {
  const { slug } = req.params;
  return ProxyService.handleRequest(req, res, slug);
});

// --- HOSTNAME & CUSTOM DOMAIN ROUTER ---
// Routes traffic based on the hostname (e.g. my-app.deployflow.dev OR custom-domain.com)
app.use(async (req, res, next) => {
  // Get host and strip port if present (e.g. localhost:4000 -> localhost)
  const hostWithPort = req.headers.host || '';
  let host = hostWithPort.split(':')[0];

  // --- MAGIC PREVIEW OVERRIDE ---
  // Allows testing custom domains locally without editing hosts file
  // Example: http://localhost:4000/some-path?__df_host=myproject.com
  if (req.query.__df_host) {
    host = req.query.__df_host as string;
    // Set cookie to persist this preview host for session stability
    res.cookie('df_magic_host', host, { path: '/', maxAge: 24 * 60 * 60 * 1000 });
  } else if (req.cookies?.df_magic_host && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) {
    // Fallback to cookie if on localhost (Magic persistence)
    host = req.cookies.df_magic_host;
  }
  const baseDomain = process.env.APP_SUBDOMAIN_BASE || 'deployflow.dev';

  // 0. Skip for API routes and Localhost
  if (req.path.startsWith('/api/') || host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return next();
  }

  // 1. Handle Subdomains (e.g. my-app.deployflow.dev)
  if (host.endsWith(baseDomain) && host !== baseDomain) {
    const slug = host.replace(`.${baseDomain}`, '');
    return ProxyService.handleRequest(req, res, slug);
  }

  // 2. Handle Custom Domains (e.g. mydomain.com)
  if (host !== baseDomain) {
    return ProxyService.handleRequest(req, res, host);
  }

  next();
});

// --- PROJECT-AWARE LIVE HOSTING ENGINE ---
app.all('/live/:id/:subPath(*)?', async (req, res) => {
  const { id } = req.params;
  const subPath = (req.params as any).subPath || '';
  
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!deployment) {
      return res.status(404).send('<h1>Deployment record not found</h1>');
    }

    // Set sticky cookie for SPA session persistence
    res.cookie('df_last_project', id, { path: '/', maxAge: 24 * 60 * 60 * 1000 });

    // Delegate to unified Hosting Engine
    return ProxyService.serveDeployment(req, res, deployment, subPath, { 
      baseHref: `/live/${id}/` 
    });

  } catch (error) {
    logger.error('Hosting error:', error);
    res.status(500).send('Internal Server Error during hosting.');
  }
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

// API Routes are defined here but should be moved up if possible
// (I will keep them here for now but the skip logic in the middleware above handles it)

// --- SMART ASSET & API FALLBACK ---
// If a request (like /assets/main.js) 404s, check if it came from a /live/:id or a ?__df_host=... page
app.use(async (req, res, next) => {
  const referer = req.get('Referer') || '';
  const lastProject = req.cookies?.df_last_project;

  // If no referer AND no sticky cookie, we can't rescue this request
  if (!referer && !lastProject) return next();

  try {
    let deployment = null;
    let baseHref = '/';
    let liveMatch = null;
    let hostMatch = null;

    // 1. Check for /live/:id/ in Referer
    liveMatch = referer.match(/\/live\/([^\/?#]+)/);
    if (liveMatch) {
      const id = liveMatch[1];
      deployment = await prisma.deployment.findUnique({
        where: { id },
        include: { project: true }
      });
      baseHref = `/live/${id}/`;
    } 
    // 2. Check for ?__df_host= in Referer or Persistent Cookie
    else {
      hostMatch = referer.match(/[?&]__df_host=([^&]+)/);
      let magicHost = hostMatch ? decodeURIComponent(hostMatch[1]) : req.cookies?.df_magic_host;
      
      if (magicHost) {
        const project = await prisma.project.findFirst({
          where: { 
            OR: [
              { slug: magicHost },
              { domains: { some: { hostname: magicHost } } }
            ]
          },
          include: { productionDeployment: true, deployments: { where: { status: 'READY' }, orderBy: { readyAt: 'desc' }, take: 1 } }
        });
        deployment = project?.productionDeployment || project?.deployments[0];
        baseHref = '/';
      }
    }

    // 3. FALLBACK: Check sticky cookie (df_last_project)
    if (!deployment && req.cookies?.df_last_project) {
      const id = req.cookies.df_last_project;
      deployment = await prisma.deployment.findUnique({
        where: { id },
        include: { project: true }
      });
      // Try to guess if we are on a live path or custom domain based on Referer
      baseHref = referer.includes('/live/') ? `/live/${id}/` : '/';
    }

    if (deployment) {
      const subPath = req.path.startsWith('/') ? req.path.substring(1) : req.path;
      // Skip if it's the root (avoid loops)
      if (!subPath || subPath === 'index.html') return next();

      logger.info(`Rescuing asset request: ${req.path} for ${deployment.id} via Referer: ${referer}`);
      return ProxyService.serveDeployment(req, res, deployment, subPath, { baseHref });
    } else {
      if (liveMatch || hostMatch) {
        logger.warn(`Asset rescue failed: Could not find deployment for referer: ${referer}`);
      }
    }
  } catch (error) {
    logger.error('Asset rescue error:', error);
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
