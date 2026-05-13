import { Request, Response, NextFunction } from 'express';
import { DomainService } from '../services/domainService';
import { ProjectService } from '../services/projectService';
import prisma from '../config/prisma';

export const listAllDomains = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const domains = await DomainService.listAllDomains(req.user!.id);
    res.json({ success: true, data: domains });
  } catch (error) {
    next(error);
  }
};

export const listDomains = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const domains = await DomainService.listDomainsByProject(req.params.projectId, req.user!.id);
    res.json({ success: true, data: domains });
  } catch (error) {
    next(error);
  }
};

export const addDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { hostname, deploymentId } = req.body;

    // Verify project belongs to user
    const project = await ProjectService.getProject(projectId, req.user!.id);
    
    const domain = await DomainService.addDomain(projectId, project.teamId, hostname, deploymentId);
    
    // Fetch with project include for frontend
    const domainWithProject = await prisma.domain.findUnique({
      where: { id: domain.id },
      include: { project: { select: { name: true } } }
    });

    res.status(201).json({ success: true, data: domainWithProject });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'This domain is already registered to another project.' } 
      });
    }
    next(error);
  }
};

export const removeDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { domainId } = req.params;
    await DomainService.removeDomain(domainId, req.user!.id);
    res.json({ success: true, message: 'Domain removed' });
  } catch (error) {
    next(error);
  }
};

export const verifyDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { domainId } = req.params;
    const isVerified = await DomainService.verifyDomain(domainId);
    res.json({ success: true, verified: isVerified });
  } catch (error) {
    next(error);
  }
};

export const setPrimaryDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock for now
    res.json({ success: true, message: 'Primary domain set (mock)' });
  } catch (error) {
    next(error);
  }
};

export const provisionSSL = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { domainId } = req.params;
    const success = await DomainService.provisionSSL(domainId);
    res.json({ success });
  } catch (error) {
    next(error);
  }
};

export const configureRedirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, message: 'Redirect configured (mock)' });
  } catch (error) {
    next(error);
  }
};
