import { Request, Response, NextFunction } from 'express';

export const listWebhooks = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, data: [] });
};

export const createWebhook = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'Webhook created (mock)' });
};

export const updateWebhook = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'Webhook updated (mock)' });
};

export const deleteWebhook = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'Webhook deleted (mock)' });
};

export const testWebhook = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'Webhook test sent (mock)' });
};

export const listDeliveries = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, data: [] });
};

export const redeliver = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'Webhook redelivered (mock)' });
};
