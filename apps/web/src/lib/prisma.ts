import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Use pooler URL for app connections; DIRECT_URL is reserved for migrations only.
  // The pooler (PgBouncer) is more reliable for serverless/dev environments where
  // port 5432 direct connections may timeout on cold-start or behind firewalls.
  const connectionString = process.env.DATABASE_URL!;
  // Strip pgbouncer param — pg.Pool doesn't understand it and it disables
  // prepared statements which breaks the PrismaPg adapter.
  const cleanUrl = connectionString.replace(/[?&]pgbouncer=true/i, '').replace(/[?&]connect_timeout=\d+/i, '');
  const pool = new Pool({
    connectionString: cleanUrl,
    max: 3,                          // Neon free tier max connections
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 60_000,
    ssl: { rejectUnauthorized: false },
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
