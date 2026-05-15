import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  name: z.string().min(2),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

export const verify2FASchema = z.object({
  token: z.string().length(6),
});
