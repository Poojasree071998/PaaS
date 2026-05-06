import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import prisma from '../config/prisma';
import { ConflictError, UnauthorizedError, BadRequestError } from '../utils/errors';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    const hashedPassword = await AuthService.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const tokens = AuthService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await AuthService.comparePassword(password, user.password))) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = AuthService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const decoded = AuthService.verifyRefreshToken(refreshToken) as any;

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokens = AuthService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: { ...tokens },
    });
  } catch (error) {
    next(new UnauthorizedError('Invalid refresh token'));
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, avatar: true, twoFactorEnabled: true }
    });
    
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
