import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Prefer DIRECT_URL so pg.Pool manages its own connections without going
  // through PgBouncer (pooler). Stacking pg.Pool on top of the pooler URL
  // causes P1001 "Can't reach database" errors under concurrent requests.
  // DIRECT_URL uses port 5432 directly — correct for the PrismaPg adapter.
  const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
  // Strip pgbouncer/connect_timeout params that pg.Pool doesn't understand.
  const cleanUrl = rawUrl.replace(/[?&]pgbouncer=true/gi, '').replace(/[?&]connect_timeout=\d+/gi, '');
  // DB_POOL_MAX: tune per plan. Free Neon = 20 total; paid = 100+.
  // Keep headroom for migrations and direct psql sessions.
  const maxConn = parseInt(process.env.DB_POOL_MAX || '10', 10);
  const pool = new Pool({
    connectionString: cleanUrl,
    max:                    maxConn,
    idleTimeoutMillis:      30_000,
    connectionTimeoutMillis:30_000, // Neon cold-start can take 15-25s
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
