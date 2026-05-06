import { Request, Response, NextFunction } from 'express';

export const listUsers = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: [] });
export const suspendUser = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'User suspended' });
export const listProjects = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: [] });
export const listDeployments = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: [] });
export const getStats = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
