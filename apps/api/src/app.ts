import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middlewares/errorHandler';
import { standardRateLimiter } from './middlewares/rateLimiter';
import logger from './config/logger';

import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import projectRoutes from './routes/projectRoutes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(standardRateLimiter);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'UP' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);

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
