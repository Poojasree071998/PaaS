import httpProxy from 'http-proxy';
import { Request, Response } from 'express';
import logger from '../config/logger';
import prisma from '../config/prisma';
import { BuildService } from './buildService';

const proxy = httpProxy.createProxyServer({
  ws: true // Enable WebSocket proxying
});

// Error handling for the proxy
proxy.on('error', async (err, req: any, res: any) => {
  logger.error('Proxy Error:', err);
  
  const deploymentId = req._deploymentId;
  if (deploymentId) {
    logger.warn(`Cleaning up stale deployment state for ${deploymentId}`);
    // Clear the stale port from memory so next request triggers auto-wake
    BuildService.stopProcess(deploymentId);
  }

  if (res && 'status' in res && typeof res.status === 'function') {
    res.status(502).send(`
      <div style="font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; color: white;">
        <div style="text-align: center; max-width: 500px; padding: 20px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #ef4444;">Connection Interrupted</h1>
          <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">The deployment process was found in a stale state. We are resetting it now.</p>
          <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
          <script>setTimeout(() => window.location.reload(), 3000);</script>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </div>
      </div>
    `);
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
      let targetPort = BuildService.getRunningPort(deployment.id);
      
      // --- AUTO-WAKE LOGIC ---
      // If project is READY but not running, wake it up!
      if (!targetPort && deployment.status === 'READY' && !BuildService.isBuilding(deployment.id)) {
        logger.info(`Auto-waking deployment ${deployment.id} for domain ${slug}`);
        BuildService.runBuild(deployment.id).catch(() => {});
        
        return res.status(503).send(`
          <div style="font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; color: white;">
            <div style="text-align: center; max-width: 500px; padding: 20px;">
              <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
              <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px;">Waking Up Domain...</h1>
              <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">The project linked to this domain is starting up. It will be ready in a few seconds.</p>
              <script>setTimeout(() => window.location.reload(), 5000);</script>
              <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </div>
          </div>
        `);
      }

      if (!targetPort) targetPort = deployment.port || 5000;
      const target = `http://localhost:${targetPort}`;

      logger.info(`Proxying request for ${slug} to ${target}`);

      // 3. Attach deployment ID to request for error handling
      (req as any)._deploymentId = deployment.id;

      // 4. Forward the request
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
