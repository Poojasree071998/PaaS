import prisma from '../config/prisma';
import { BuildService } from './buildService';
import logger from '../config/logger';

export class OrchestrationService {
  /**
   * Deploys a full-stack project in the correct order:
   * 1. Backend/API (to generate a URL)
   * 2. Frontend (injecting the Backend URL)
   */
  static async deployFullStack(projectId: string, userId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { deployments: true }
      });

      if (!project) throw new Error('Project not found');

      logger.info(`Orchestrating full-stack deployment for: ${project.name}`);

      // 1. Identify Backend and Frontend components
      // In a real app, we'd use folder detection. For now, we use the root project.
      
      // 2. Trigger Backend Deployment
      const backendDeployment = await BuildService.runBuild(projectId);
      
      // 3. Wait for Backend to be READY and get its URL
      // (This is a simplified version - in production we'd use a callback/webhook)
      const backendUrl = `https://${project.slug}.deployflow.dev`; 

      // 4. Inject Backend URL into Team/Project Env Vars
      await prisma.environmentVariable.upsert({
        where: {
          projectId_key_environment: {
            projectId: project.id,
            key: 'NEXT_PUBLIC_API_URL',
            environment: 'PRODUCTION'
          }
        },
        update: { value: backendUrl },
        create: {
          projectId: project.id,
          teamId: project.teamId,
          key: 'NEXT_PUBLIC_API_URL',
          value: backendUrl,
          environment: 'PRODUCTION'
        }
      });

      logger.info(`Injected backend URL ${backendUrl} into ${project.name} frontend environment.`);

      // 5. Trigger Frontend Deployment (with the new ENV)
      return BuildService.runBuild(projectId);

    } catch (error) {
      logger.error('Orchestration failed:', error);
      throw error;
    }
  }
}
