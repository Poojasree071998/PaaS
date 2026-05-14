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
    const { repoUrl, buildCommand, branch, rootDirectory, envVars } = req.body;
    
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
    
    // Always analyze for fresh settings (True Auto-Pilot)
    let analysis;
    try {
      analysis = await AnalysisService.analyzeRepository(repoUrl);
    } catch (e) {
      console.warn('Auto-analysis failed, falling back to defaults:', e);
      analysis = {
        framework: Framework.STATIC,
        databaseRequired: 'NONE',
        buildCommand: 'npm run build',
        rootDirectory: './',
        requiredEnvVars: [],
        detectedEnv: {}
      };
    }


    const processedEnvVars = envVars ? envVars.filter((v: any) => v.key && v.value) : [];

    if (!project) {
      const name = repoUrl.split('/').pop() || 'new-project';
      project = await prisma.project.create({
        data: {
          name,
          slug: `${name}-${Date.now()}`,
          repoUrl,
          repoProvider: RepoProvider.GITHUB,
          repoId: 'manual',
          framework: (analysis.framework as Framework) || Framework.STATIC,
          teamId: team.id,
          userId,
          buildCommand: buildCommand || analysis.buildCommand || 'npm run build',
          repoBranch: branch || 'main',
          rootDirectory: rootDirectory || analysis.rootDirectory || './',
          envVars: {
            create: processedEnvVars
          }
        }
      });
      // --- AUTO-PROVISIONING (Zero-Config DB) ---
      if (analysis.databaseRequired !== 'NONE') {
        const dbType = analysis.databaseRequired;
        const existingDb = await prisma.managedDatabase.findFirst({
          where: { projectId: project.id, type: dbType as any }
        });

        if (!existingDb) {
          const { DatabaseService } = require('../services/databaseService');
          await DatabaseService.provisionDatabase(userId, {
            projectId: project.id,
            teamId: team.id,
            name: `${name}-db`,
            type: dbType,
            plan: 'FREE'
          }).catch((e: any) => console.error('Auto-provisioning failed:', e));
        }
      }
    } else {
      // Update existing project with new settings if provided, else use analysis
      project = await prisma.project.update({
        where: { id: project.id },
        data: {
          buildCommand: buildCommand || project.buildCommand || analysis.buildCommand,
          repoBranch: branch || project.repoBranch,
          rootDirectory: rootDirectory || project.rootDirectory || analysis.rootDirectory,
          framework: (analysis.framework as Framework) || project.framework,
          envVars: {
            deleteMany: {}, // Clear old ones for simplicity in this demo
            create: processedEnvVars
          }
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
  // Rollback is essentially promoting a previous version
  return promoteDeployment(req, res, next);
};

export const promoteDeployment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deploymentId } = req.params;
    
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true }
    });

    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });
    if (deployment.status !== 'READY') return res.status(400).json({ success: false, message: 'Only READY deployments can be promoted' });

    // Update project production pointer
    await prisma.project.update({
      where: { id: deployment.projectId },
      data: { productionDeploymentId: deploymentId }
    });

    // Ensure it is running
    await BuildService.ensureRunning(deploymentId);

    res.json({ 
      success: true, 
      message: 'Deployment promoted to production successfully',
      data: { 
        deploymentId,
        projectId: deployment.projectId,
        url: deployment.url
      } 
    });
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

export const deleteDeployment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deploymentId } = req.params;
    
    // 1. Stop process if running
    try {
      await BuildService.stopProcess(deploymentId);
    } catch (e) {}
    
    // 2. Delete logs first (foreign key constraint)
    await prisma.buildLog.deleteMany({ where: { deploymentId } });
    
    // 3. Delete deployment
    await prisma.deployment.delete({ where: { id: deploymentId } });
    
    res.json({ success: true, message: 'Deployment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
