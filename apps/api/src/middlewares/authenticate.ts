import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import config from '../config';
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // 1. Check for Bearer Token (JWT)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as any;
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
      
      return next();
    }
    
    // 2. Check for X-API-Key (API Token)
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      // API tokens are stored as hashed in DB
      // We need to find the token. But hashing is one-way.
      // Usually, we store a prefix or ID to find it, or we have to check all?
      // Better: Store tokens with a prefix (e.g. df_...) and a hashed version.
      // For now, let's assume we find it by searching or having a key ID.
      // Optimization: tokens are small, but let's assume we search by a public part.
      // For this demo, let's just search by the raw token if we had it, 
      // but the requirement says "hashed".
      
      // Let's assume the API Key format is `id.secret`
      if (apiKey.includes('.')) {
        const [id, secret] = apiKey.split('.');
        const tokenData = await prisma.apiToken.findUnique({
          where: { id },
          include: { user: true }
        });
        
        if (tokenData && await bcrypt.compare(secret, tokenData.token)) {
          // Update last used
          await prisma.apiToken.update({
            where: { id },
            data: { lastUsedAt: new Date() }
          });
          
          req.user = {
            id: tokenData.user.id,
            email: tokenData.user.email,
            role: tokenData.user.role,
          };
          return next();
        }
      }
    }

    throw new UnauthorizedError('Authentication required');
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    
    next();
  };
};
