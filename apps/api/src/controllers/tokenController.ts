import { Request, Response, NextFunction } from 'express';

export const listTokens = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, data: [] });
};

export const createToken = async (req: Request, res: Response, next: NextFunction) => {
  res.status(201).json({ success: true, message: 'Token created (mock)', data: { token: 'mock-token' } });
};

export const revokeToken = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'Token revoked (mock)' });
};
