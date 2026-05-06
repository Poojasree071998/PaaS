import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const auditLogger = (resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only log mutating actions
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          try {
            await prisma.auditLog.create({
              data: {
                userId: req.user.id,
                teamId: req.body.teamId || req.params.teamId || 'SYSTEM', // simplified
                action: req.method,
                resource,
                resourceId: req.params.id || req.params.projectId || null,
                ip: req.ip || '',
                userAgent: req.get('user-agent') || '',
              }
            });
          } catch (error) {
            console.error('Failed to write audit log', error);
          }
        }
      });
    }
    next();
  };
};
