import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  
  JWT_ACCESS_SECRET: z.string().default('dev-secret-access'),
  JWT_REFRESH_SECRET: z.string().default('dev-secret-refresh'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  
  ENCRYPTION_MASTER_KEY: z.string().default('12345678901234567890123456789012'),
  
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  DOCKER_SOCKET_PATH: z.string().default('/var/run/docker.sock'),
  
  APP_DOMAIN: z.string().default('deployflow.app'),
  APP_SUBDOMAIN_BASE: z.string().default('deployflow.dev'),
  
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Prepare raw environment with defaults
const rawEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || (!isProduction ? 'postgresql://postgres:postgres@localhost:5432/deployflow' : undefined),
  REDIS_URL: process.env.REDIS_URL || (!isProduction ? 'redis://localhost:6379' : undefined),
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  const formatted = parsed.error.format();
  Object.entries(formatted).forEach(([key, value]) => {
    if (key !== '_errors') {
      console.error(`   ${key}: ${(value as any)._errors.join(', ')}`);
    }
  });
  
  process.exit(1);
}

// Validation warnings for critical missing variables in production
if (isProduction) {
  if (!parsed.data.DATABASE_URL) {
    console.warn('⚠️ WARNING: DATABASE_URL is missing. Database features will be unavailable.');
  }
  if (!parsed.data.REDIS_URL) {
    console.warn('⚠️ WARNING: REDIS_URL is missing. Background queues and real-time updates will be unavailable.');
  }
}

// Manually set defaults for libraries that read directly from process.env (like Prisma)
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = parsed.data.DATABASE_URL;
if (!process.env.REDIS_URL) process.env.REDIS_URL = parsed.data.REDIS_URL;

export const config = parsed.data;
export default config;
