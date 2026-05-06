import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { UnprocessableEntityError } from '../utils/errors';

export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error: any) {
      next(new UnprocessableEntityError('Validation failed', 'VALIDATION_ERROR', error.errors));
    }
  };
};
