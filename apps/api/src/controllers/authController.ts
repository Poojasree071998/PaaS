import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import prisma from '../config/prisma';
import { ConflictError, UnauthorizedError, BadRequestError } from '../utils/errors';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { email, password, name } = req.body;

    // Enforce name capitalization
    if (name) {
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    
    // Default password to name in lowercase ONLY if not provided
    if (name && !password) {
      password = name.toLowerCase();
    }
    
    if (email) {
      // Email: Always lowercase for consistency
      email = email.toLowerCase();
    }

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
    let { email, password } = req.body;
    
    // Consistent email casing
    if (email) {
      email = email.toLowerCase();
    }

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

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  // In a real implementation, you might want to invalidate the refresh token in Redis
  res.json({ success: true, message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Generate reset token, save to DB/Redis, send email
  res.json({ success: true, message: 'Password reset email sent (mock)' });
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Verify reset token, update password
  res.json({ success: true, message: 'Password reset successfully (mock)' });
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Verify email token
  res.json({ success: true, message: 'Email verified successfully (mock)' });
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { name, avatar } = req.body;
    let updateData: any = { avatar };
    
    if (name) {
      // Enforce capitalization on name update
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      updateData.name = name;
      
      // Enforce password update to match new name (per user requirement)
      const hashedPassword = await AuthService.hashPassword(name.toLowerCase());
      updateData.password = hashedPassword;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, avatar: true }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const enable2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { secret, qrCodeUrl } = await AuthService.generate2FA(req.user!.id);
    
    // Save secret to user
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorSecret: secret }
    });
    
    res.json({ success: true, data: { qrCodeUrl, secret } });
  } catch (error) {
    next(error);
  }
};

export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    
    if (!user?.twoFactorSecret) {
      throw new BadRequestError('2FA is not initiated');
    }
    
    const isValid = AuthService.verify2FAToken(user.twoFactorSecret, token);
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    });
    
    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    next(error);
  }
};

export const disable2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    next(error);
  }
};

export const githubOAuth = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Redirect to GitHub OAuth
  res.redirect('https://github.com/login/oauth/authorize?client_id=MOCK');
};

export const githubOAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Exchange code for token, upsert user, generate JWT tokens
  res.json({ success: true, message: 'GitHub OAuth Callback (mock)' });
};

export const gitlabOAuth = async (req: Request, res: Response, next: NextFunction) => {
  res.redirect('https://gitlab.com/oauth/authorize?client_id=MOCK');
};

export const gitlabOAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, message: 'GitLab OAuth Callback (mock)' });
};
