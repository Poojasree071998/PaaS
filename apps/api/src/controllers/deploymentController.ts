import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { BuildService } from '../services/buildService';
import { Framework, RepoProvider } from '@prisma/client';

export const triggerDeploy = async (req: Request, res: Response, next: NextFunction) => {
  try {


    // 2. Find or create a project
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
        }
      });
    }

    // 3. Trigger build
    const deployment = await BuildService.triggerBuild(project.id, userId);

    res.json({ success: true, data: deployment });
  } catch (error) {
    next(error);
  }
};

export const listDeployments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deployments = await prisma.deployment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: true }
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
