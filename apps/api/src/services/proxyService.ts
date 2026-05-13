import httpProxy from 'http-proxy';
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import logger from '../config/logger';
import prisma from '../config/prisma';
import { BuildService } from './buildService';

const proxy = httpProxy.createProxyServer({
  ws: true // Enable WebSocket proxying
});

// DEBUG LOGGING
const debugLog = (msg: string) => {
  try {
    fs.appendFileSync(path.join(process.cwd(), 'hosting-debug.log'), `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
};

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
          productionDeployment: true,
          domains: {
            where: { hostname: slug },
            include: { deployment: true } as any
          },
          deployments: {
            where: { status: 'READY' },
            orderBy: { readyAt: 'desc' },
            take: 1
          }
        } as any
      }) as any;

      if (!project || (!project.productionDeployment && project.deployments.length === 0)) {
        return res.status(404).send('<h1>404: Project not found or not deployed yet</h1>');
      }

      // 1. Check if the specific domain has a pinned deployment
      const matchedDomain = project.domains.find((d: any) => d.hostname === slug);
      let deployment = matchedDomain?.deployment || project.productionDeployment || project.deployments[0];

      // Set sticky cookie for asset rescue and session persistence
      res.cookie('df_last_project', deployment.id, { path: '/', maxAge: 24 * 60 * 60 * 1000 });

      // Determine subPath: either from route params or from the raw request path
      let subPath = (req.params as any).subPath || '';
      if (!subPath && req.path && req.path !== '/') {
        subPath = req.path.startsWith('/') ? req.path.substring(1) : req.path;
      }

      // Use the unified hosting engine
      return this.serveDeployment(req, res, deployment, subPath, { baseHref: '/' });

    } catch (error) {
      logger.error('Proxy routing error:', error);
      res.status(500).send('Internal Server Error during routing');
    }
  }

  /**
   * Unified Hosting Engine: Serves static files or proxies to a backend
   */
  static async serveDeployment(req: Request, res: Response, deployment: any, subPath: string, options: { baseHref: string }) {
    const { id, projectId } = deployment;
    const { baseHref } = options;
    debugLog(`ServeDeployment: id=${id} subPath="${subPath}" baseHref="${baseHref}"`);

    try {
      // 0. Path Cleanup: Strip any /live/:id/ prefix if it escaped into the subPath
      let cleanPath = subPath;
      const livePrefix = `live/${id}/`;
      if (cleanPath.startsWith(livePrefix)) {
        cleanPath = cleanPath.substring(livePrefix.length);
      }
      debugLog(`CleanPath: "${cleanPath}"`);

      // 1. Resolve Root Directory
      const buildRoot = path.join(process.cwd(), 'temp-builds', projectId);
      
      // --- AUTO-RECOVERY ---
      if (!fs.existsSync(buildRoot)) {
        logger.warn(`Deployment ${id} files missing. Triggering auto-recovery...`);
        BuildService.runBuild(id).catch(err => logger.error('Recovery failed:', err));
        
        return res.status(503).send(`
          <div style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: auto; text-align: center; background: #09090b; color: white; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
            <h1 style="color: #3b82f6;">Restoring Deployment...</h1>
            <p style="color: #71717a;">The server recently restarted and is currently restoring this project from Git. It will be live again in about 60 seconds.</p>
            <script>setTimeout(() => window.location.reload(), 15000);</script>
          </div>
        `);
      }

      // --- SMART PROCESS RE-LINKING ---
      let targetPort = BuildService.getRunningPort(id);
      if (!targetPort && deployment.status === 'READY' && !BuildService.isBuilding(id)) {
        logger.info(`Auto-waking deployment ${id}`);
        BuildService.runBuild(id).catch(() => {});
        
        return res.status(502).send(`
          <div style="font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; color: white;">
            <div style="text-align: center; max-width: 500px; padding: 20px;">
              <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
              <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px;">System Re-linking...</h1>
              <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">The platform is re-connecting to your project. Please wait.</p>
              <script>setTimeout(() => window.location.reload(), 5000);</script>
              <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </div>
          </div>
        `);
      }

      // 2. Resolve Monorepo Paths
      let projectPath = buildRoot;
      const projectData = deployment.project || await prisma.project.findUnique({ where: { id: projectId } });
      if (projectData?.rootDirectory && projectData.rootDirectory !== './') {
        const cleanRoot = projectData.rootDirectory.replace(/^\.\//, '');
        projectPath = path.join(buildRoot, cleanRoot);
      }

      // 3. Define Search Folders (Expanded for deep assets)
      const searchFolders = [
        path.join(projectPath, 'dist'),
        path.join(projectPath, 'build'),
        path.join(projectPath, 'public'),
        path.join(projectPath, 'out'),
        path.join(projectPath, '.next', 'static'),
        path.join(projectPath, 'build', 'static'),
        path.join(projectPath, 'client', 'dist'),
        path.join(projectPath, 'frontend', 'dist'),
        path.join(projectPath, 'apps', 'web', 'dist'),
        path.join(projectPath, 'web', 'dist'),
        // Sub-assets folders
        path.join(projectPath, 'dist', 'assets'),
        path.join(projectPath, 'build', 'assets'),
        path.join(projectPath, 'frontend', 'dist', 'assets'),
        projectPath,
      ];

      const isApiRequest = cleanPath.startsWith('api/') || cleanPath.startsWith('v1/') || cleanPath.includes('graphql');

      // --- STATIC SERVING ---
      if (!isApiRequest) {
        // A. Direct File Match (with variant fallback)
        const variants = [cleanPath];
        if (cleanPath.includes('/')) {
          variants.push(cleanPath.split('/').pop() || '');
          if (cleanPath.startsWith('assets/')) variants.push(cleanPath.replace('assets/', ''));
          if (cleanPath.startsWith('static/')) variants.push(cleanPath.replace('static/', ''));
          if (cleanPath.startsWith('_next/')) variants.push(cleanPath.replace('_next/', ''));
        }
        debugLog(`Searching Variants: ${variants.join(', ')} in folders: ${searchFolders.length}`);

        for (const folder of searchFolders) {
          for (const variant of variants) {
            if (!variant) continue;
            const targetFile = path.normalize(path.join(folder, variant));
            if (fs.existsSync(targetFile) && !fs.lstatSync(targetFile).isDirectory()) {
              return res.sendFile(targetFile);
            }
          }
        }

        // B. SPA Fallback
        if (!cleanPath || !cleanPath.includes('.') || cleanPath === 'index.html') {
          for (const folder of searchFolders) {
            const indexPath = path.join(folder, 'index.html');
            if (fs.existsSync(indexPath)) {
              let html = fs.readFileSync(indexPath, 'utf8');
              
              // Path Normalization Engine
              const baseTag = `<base href="${baseHref}">`;
              const transformHtml = (content: string) => {
                let body = content;
                
                // 1. Inject <base> tag (ensure it's the first in <head>)
                if (/<head>/i.test(body)) body = body.replace(/<head>/i, `<head>\n    ${baseTag}`);
                else if (/<html>/i.test(body)) body = body.replace(/<html>/i, `<html>\n<head>${baseTag}</head>`);
                else body = baseTag + body;
                
                // 2. Absolute Path Correction (only for non-custom domains)
                if (baseHref !== '/') {
                  body = body.replace(/(src|href)=["']\/(?!live\/)([^"':][^"']*)["']/g, `$1="${baseHref}$2"`);
                  body = body.replace(/["']\/(?!live\/)(@vite|_next|node_modules|@fs)\//g, (m) => m.replace('/', ''));
                }
                
                // 3. API URL Injection
                const publicUrl = baseHref === '/' ? '' : baseHref;
                if (publicUrl) body = body.replace(/"\/api\//g, `"${publicUrl}api/`);
                
                return body;
              };

              res.setHeader('Content-Type', 'text/html');
              return res.send(transformHtml(html));
            }
          }
        }
      }

      // --- PROXY TO BACKEND ---
      const runningPort = targetPort || (deployment.meta as any)?.port || 5000;
      const target = `http://localhost:${runningPort}`;
      
      const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      req.url = '/' + cleanPath + queryString;

      logger.info(`Proxying request for ${id} to ${target}${req.url}`);
      (req as any)._deploymentId = id;

      proxy.web(req, res, { target, changeOrigin: true, proxyTimeout: 30000 }, (err) => {
        logger.error('Proxy Error:', err);
        res.status(502).send('<h1>502: Backend Unreachable</h1>');
      });

    } catch (error) {
      logger.error('Hosting Engine Error:', error);
      res.status(500).send('Internal Server Error during hosting');
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
