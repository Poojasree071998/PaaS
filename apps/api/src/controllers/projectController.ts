import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/projectService';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectService.createProject({
      ...req.body,
      userId: req.user!.id,
    });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

export const listProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.query.teamId as string;
    const projects = await ProjectService.listProjects(teamId, req.user!.id);
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectService.getProject(req.params.projectId, req.user!.id);
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, message: 'Project updated (mock)' });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, message: 'Project deleted (mock)' });
  } catch (error) {
    next(error);
  }
};

export const getProjectStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, data: { deployments: 10, successRate: 95 } });
  } catch (error) {
    next(error);
  }
};

export const pauseProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, message: 'Project paused (mock)' });
  } catch (error) {
    next(error);
  }
};

export const resumeProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, message: 'Project resumed (mock)' });
  } catch (error) {
    next(error);
  }
};

export const searchRepos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

export const detectFramework = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // mock
    res.json({ success: true, data: { framework: 'NEXTJS' } });
  } catch (error) {
    next(error);
  }
};
