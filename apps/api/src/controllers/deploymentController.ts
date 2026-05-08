import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { BuildService } from '../services/buildService';
import { Framework, RepoProvider } from '@prisma/client';
import { AnalysisService } from '../services/analysisService';

export const analyzeProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ success: false, message: 'Repo URL is required' });

    const analysis = await AnalysisService.analyzeRepository(repoUrl);
    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

export const triggerDeploy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repoUrl, buildCommand, branch, rootDirectory } = req.body;
    
    // 1. Get or create a default user for the demo
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'admin@deployflow.app',
          name: 'Admin User',
          password: 'demo-only',
        }
      });
    }
    const userId = user.id;

    // 2. Find or create a team
    let team = await prisma.team.findFirst({ where: { ownerId: userId } });
    if (!team) {
      team = await prisma.team.create({
        data: { name: 'Personal Team', slug: `personal-${Date.now()}`, ownerId: userId }
      });
    }

    // 3. Find or create a project
    let project = await prisma.project.findFirst({ where: { repoUrl } });
    if (!project) {
      const name = repoUrl.split('/').pop() || 'new-project';
      project = await prisma.project.create({
        data: {
          name,
          slug: `${name}-${Date.now()}`,
          repoUrl,
          repoProvider: RepoProvider.GITHUB,
          repoId: 'manual',
          framework: Framework.NEXTJS,
          teamId: team.id,
          userId,
          buildCommand: buildCommand || 'npm run build',
          repoBranch: branch || 'main',
          rootDirectory: rootDirectory || '/'
        }
      });
    } else {
      // Update existing project with new settings if provided
      project = await prisma.project.update({
        where: { id: project.id },
        data: {
          buildCommand: buildCommand || project.buildCommand,
          repoBranch: branch || project.repoBranch,
          rootDirectory: rootDirectory || project.rootDirectory
        }
      });
    }

    // 4. Trigger build
    const deployment = await BuildService.triggerBuild(project.id, userId, branch || project.repoBranch);

    res.json({ success: true, data: deployment });
  } catch (error) {
    next(error);
  }
};

export const listDeployments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Proactive Cleanup: Mark builds as ERROR if they've been BUILDING for more than 30 mins
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.deployment.updateMany({
      where: { status: 'BUILDING', updatedAt: { lt: thirtyMinsAgo } },
      data: { status: 'ERROR', errorMessage: 'Build timed out (Stuck)' }
    });

    const deployments = await prisma.deployment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        project: {
          select: { name: true, repoUrl: true, framework: true }
        }
      },
      take: 50
    });
    res.json({ success: true, data: deployments });
  } catch (error) {
    next(error);
  }
};

export const getDeployment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: req.params.deploymentId },
      include: { project: true }
    });
    
    if (!deployment) {
      return res.status(404).json({ success: false, message: 'Deployment not found' });
    }

    res.json({ success: true, data: deployment });
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.buildLog.findMany({
      where: { deploymentId: req.params.deploymentId },
      orderBy: { timestamp: 'asc' }
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

export const cancelDeployment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Deployment cancelled (mock)' });
  } catch (error) {
    next(error);
  }
};

export const rollbackDeployment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Rollback triggered (mock)' });
  } catch (error) {
    next(error);
  }
};

export const promoteDeployment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Deployment promoted (mock)' });
  } catch (error) {
    next(error);
  }
};

export const getChecks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

export const getDeploymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deploymentId } = req.params;
    const isRunning = BuildService.isProcessRunning(deploymentId);
    const port = BuildService.getRunningPort(deploymentId);
    
    res.json({ 
      success: true, 
      data: { 
        deploymentId, 
        isProcessRunning: isRunning,
        port: port,
        status: isRunning ? 'ACTIVE' : 'STOPPED'
      } 
    });
  } catch (error) {
    next(error);
  }
};
