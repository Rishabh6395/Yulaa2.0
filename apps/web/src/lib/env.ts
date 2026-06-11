/**
 * Centralized environment variable validation using Zod.
 *
 * This module is the single source of truth for all required env vars.
 * Import `env` instead of reading process.env directly — this ensures:
 *  1. The app fails fast at startup with a clear message if config is missing.
 *  2. All vars are typed (string, number, enum) — no silent undefined.
 *
 * Set SKIP_ENV_VALIDATION=true to skip during Next.js build phase.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:             z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL:         z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:           z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY:           z.string().default('7d'),

  // Redis — optional; app degrades gracefully without it
  REDIS_URL:            z.string().optional(),

  // Email — optional in dev (falls back to console logging)
  BREVO_API_KEY:        z.string().optional(),
  BREVO_SENDER_NAME:    z.string().optional(),
  BREVO_SENDER_EMAIL:   z.string().email().optional(),

  // Cron — must be set in production
  CRON_SECRET:          z.string().optional(),

  // Public vars
  NEXT_PUBLIC_APP_URL:  z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Yulaa'),

  LOG_LEVEL:            z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function validateEnv() {
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    // Use console.error here — logger may not be initialised yet
    console.error(`\n[env] Invalid environment configuration:\n${missing}\n`);
    throw new Error('Invalid environment configuration — check your .env file');
  }
  return result.data;
}

export const env = validateEnv();
