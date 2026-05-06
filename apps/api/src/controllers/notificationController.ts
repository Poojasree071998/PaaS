import { Request, Response, NextFunction } from 'express';

export const listNotifications = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: [] });
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'Marked read' });
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'All marked read' });
export const getPreferences = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'Preferences updated' });
export const connectSlack = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'Slack connected' });
export const connectDiscord = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'Discord connected' });
