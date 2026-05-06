import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import config from '../config';
import prisma from '../config/prisma';
import { UnauthorizedError, ConflictError, BadRequestError } from '../utils/errors';
import { Role } from '@prisma/client';

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateTokens(payload: { id: string; email: string; role: Role }) {
    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: (config.JWT_EXPIRES_IN || this.ACCESS_TOKEN_EXPIRY) as any,
    });
    
    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string) {
    return jwt.verify(token, config.JWT_ACCESS_SECRET);
  }

  static verifyRefreshToken(token: string) {
    return jwt.verify(token, config.JWT_REFRESH_SECRET);
  }

  static async generate2FA(userId: string) {
    const secret = speakeasy.generateSecret({
      name: `DeployFlow:${userId}`,
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  static verify2FAToken(secret: string, token: string) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }
}
