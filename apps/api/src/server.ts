import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import config from './config';
import logger from './config/logger';
import prisma from './config/prisma';
import './workers/buildWorker';

const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Attach Socket.io to request if needed
// app.set('io', io);

const PORT = config.PORT || 4000;

async function bootstrap() {
  try {
    // 1. Connect to Database
    await prisma.$connect();
    logger.info('🐘 Connected to Database');

    // 2. Start Server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📡 WebSocket server ready`);
    });
  } catch (error) {
    logger.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Process terminated');
  });
});
