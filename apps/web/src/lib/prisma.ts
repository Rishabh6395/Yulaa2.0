import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const cleanUrl = connectionString.replace(/[?&]pgbouncer=true/i, '').replace(/[?&]connect_timeout=\d+/i, '');
  const pool = new Pool({
    connectionString: cleanUrl,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

  // Auto-reconnect on Neon cold-start ETIMEDOUT errors
  pool.on('error', (err: any) => {
    if (process.env.NODE_ENV === 'development') console.warn('[pool] idle client error:', err.code);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
