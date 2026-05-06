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

export const updateTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, avatar } = req.body;
    // Mock update
    res.json({ success: true, data: { id: req.params.teamId, name, avatar } });
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Team deleted (mock)' });
  } catch (error) {
    next(error);
  }
};

export const listMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: [] }); // mock
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Member invited (mock)' });
  } catch (error) {
    next(error);
  }
};

export const changeMemberRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Member role changed (mock)' });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Member removed (mock)' });
  } catch (error) {
    next(error);
  }
};

export const getInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: { token: req.params.token } }); // mock
  } catch (error) {
    next(error);
  }
};

export const acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, message: 'Invite accepted (mock)' });
  } catch (error) {
    next(error);
  }
};
