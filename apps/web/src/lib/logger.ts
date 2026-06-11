/**
 * Structured logger using pino.
 * In development: pretty-prints with pino-pretty.
 * In production: outputs newline-delimited JSON — forward to Datadog/Logtail/Axiom.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ schoolId, userId }, 'Student created');
 *   logger.error({ err, requestId }, 'Payment failed');
 *
 * Always include context fields (schoolId, userId, requestId) rather than
 * interpolating them into the message string — this makes logs searchable.
 */
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {
        // Production: plain JSON, no transport overhead
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

/** Create a child logger bound to a specific request context. */
export function requestLogger(requestId: string, meta?: Record<string, unknown>) {
  return logger.child({ requestId, ...meta });
}
