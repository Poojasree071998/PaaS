import httpProxy from 'http-proxy';
import { Request, Response } from 'express';
import logger from '../config/logger';
import prisma from '../config/prisma';
import { BuildService } from './buildService';

const proxy = httpProxy.createProxyServer({
  ws: true // Enable WebSocket proxying
});

// Error handling for the proxy
proxy.on('error', (err, req, res) => {
  logger.error('Proxy Error:', err);
  if (res && 'status' in res && typeof res.status === 'function') {
    (res as any).status(502).json({ error: 'Deployment not responding' });
  }
});

export class ProxyService {
  /**
   * Routes a request to the correct deployment based on the slug or domain
   */
  static async handleRequest(req: Request, res: Response, slug: string) {
    try {
      // 1. Find the project and its active production deployment
      const project = await prisma.project.findFirst({
        where: { 
          OR: [
            { slug: slug },
            { 
              domains: {
                some: { hostname: slug }
              }
            }
          ]
        },
        include: { 
          productionDeployment: true 
        }
      }) as any;

      if (!project || !project.productionDeployment) {
        return res.status(404).send('<h1>404: Project not found or not deployed yet</h1>');
      }

      const deployment = project.productionDeployment;

      // 2. Check if the deployment is actually running
      // Get the real running port from BuildService
      const targetPort = BuildService.getRunningPort(deployment.id) || deployment.port || 5000;
      const target = `http://localhost:${targetPort}`;

      logger.info(`Proxying request for ${slug} to ${target}`);

      // 3. Forward the request
      proxy.web(req, res, { target });

    } catch (error) {
      logger.error('Proxy routing error:', error);
      res.status(500).send('Internal Server Error during routing');
    }
  }

  /**
   * Handles WebSocket proxying
   */
  static handleUpgrade(req: any, socket: any, head: any) {
    const host = req.headers.host;
    // Extract slug from hostname (e.g., myapp.deployflow.com)
    const slug = host.split('.')[0];
    
    // In a real setup, we'd lookup the port in Redis/DB and proxy the WS
    logger.info(`WebSocket upgrade requested for ${slug}`);
  }
}
