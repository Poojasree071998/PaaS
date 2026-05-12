import { MongoMemoryServer } from 'mongodb-memory-server';
import logger from '../config/logger';

const servers = new Map<string, MongoMemoryServer>();

export class ManagedMongoService {
  static async getOrCreateServer(projectId: string, port: number = 27017): Promise<string> {
    if (servers.has(projectId)) {
      return servers.get(projectId)!.getUri();
    }

    logger.info(`Starting MongoMemoryServer for project ${projectId} on port ${port}...`);
    try {
      const mongod = await MongoMemoryServer.create({
        instance: {
          port: port,
          dbName: 'aicall-db',
        },
        auth: {
          customRootName: 'admin',
          customRootPwd: 'password',
        }
      });
      
      servers.set(projectId, mongod);
      const uri = mongod.getUri();
      logger.info(`MongoMemoryServer started: ${uri}`);
      return uri;
    } catch (err) {
      logger.error('Failed to start MongoMemoryServer:', err);
      // Fallback to localhost string if it fails to start (maybe port is busy)
      return `mongodb://admin:password@127.0.0.1:${port}/aicall-db?authSource=admin`;
    }
  }

  static async stopServer(projectId: string) {
    const server = servers.get(projectId);
    if (server) {
      await server.stop();
      servers.delete(projectId);
      logger.info(`MongoMemoryServer stopped for project ${projectId}`);
    }
  }
}
