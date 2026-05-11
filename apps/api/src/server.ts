import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import config from './config';
import logger from './config/logger';
import prisma from './config/prisma';
import './workers/buildWorker';

const server = http.createServer(app);

import { initSocket } from './config/socket';
import { BuildService } from './services/buildService';

// Socket.io Setup
const io = initSocket(server);

// Attach Socket.io to app instance
app.set('io', io);

const PORT = config.PORT || 4000;

async function bootstrap() {
  try {
    // 1. Connect to Database
    await prisma.$connect()
      .then(() => logger.info('🐘 Connected to Database'))
      .catch((err) => {
        logger.error('❌ Database connection failed:', err.message);
        logger.warn('⚠️ API running in limited mode (unreachable DB)');
      });

    // 2. Cleanup stuck builds (Only if DB is connected)
    try {
      await BuildService.cleanupStuckBuilds();
      logger.info('🧹 Cleaned up stuck builds');
    } catch (e) {
      logger.warn('⚠️ Could not cleanup builds: DB unreachable');
    }

    // 3. Start Server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📡 WebSocket server ready`);
    });
  } catch (error) {
    logger.error('💥 Critical failure during bootstrap:', error);
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
