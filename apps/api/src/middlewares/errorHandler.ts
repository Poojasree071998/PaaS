import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../config/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ZodError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors;
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma specific errors if needed
    statusCode = 400;
    code = 'DATABASE_ERROR';
    message = 'A database error occurred';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} - ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`${req.method} ${req.path} - ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
    },
  });
};
