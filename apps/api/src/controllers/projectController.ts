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
