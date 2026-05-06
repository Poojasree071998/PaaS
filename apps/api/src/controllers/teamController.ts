import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/teamService';

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const team = await TeamService.createTeam(req.user!.id, name);
    res.status(201).json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

export const listTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await TeamService.listUserTeams(req.user!.id);
    res.json({ success: true, data: teams });
  } catch (error) {
    next(error);
  }
};

export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await TeamService.getTeam(req.params.teamId, req.user!.id);
    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};
