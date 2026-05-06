import { Request, Response, NextFunction } from 'express';

export const getOverview = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
export const getWebVitals = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
export const getFunctions = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
export const getTraffic = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
export const getUsage = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
