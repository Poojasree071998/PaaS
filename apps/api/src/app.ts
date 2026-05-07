import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middlewares/errorHandler';
import { standardRateLimiter } from './middlewares/rateLimiter';
import logger from './config/logger';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

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

// --- SMART LIVE HOSTING ENGINE (TS FIXED) ---
app.get('/live/:id/:subPath(*)?', (req, res) => {
  const { id } = req.params;
  const subPath = (req.params as any).subPath || '';
  
  const rootPath = path.join(process.cwd(), 'temp-builds', id);
  
  if (!fs.existsSync(rootPath)) {
    return res.status(404).send('<h1>Deployment not found</h1><p>The build files for this deployment are missing or have been cleared.</p>');
  }

  const possiblePaths = [
    rootPath,
    path.join(rootPath, 'dist'),
    path.join(rootPath, 'build'),
    path.join(rootPath, 'public'),
    path.join(rootPath, 'out'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const fullFilePath = path.join(p, subPath);
      
      if (fs.existsSync(fullFilePath) && fs.lstatSync(fullFilePath).isDirectory()) {
        const indexFile = path.join(fullFilePath, 'index.html');
        if (fs.existsSync(indexFile)) {
          return res.sendFile(indexFile);
        }
      } 
      
      if (fs.existsSync(fullFilePath) && !fs.lstatSync(fullFilePath).isDirectory()) {
        return res.sendFile(fullFilePath);
      }
    }
  }

  for (const p of possiblePaths) {
    const indexFile = path.join(p, 'index.html');
    if (fs.existsSync(indexFile)) {
      return res.sendFile(indexFile);
    }
  }

  res.status(404).send('<h1>File not found</h1><p>We could not find an index.html or the requested file in your project folders.</p>');
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
