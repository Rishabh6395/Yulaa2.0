import { neonConfig, Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// Use WebSocket (port 443) so the app works on networks that block port 5432.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Neon serverless uses WebSocket over port 443 — no port 5432 needed.
  // Strip pgbouncer/connect_timeout params the serverless driver doesn't need.
  const rawUrl = process.env.DATABASE_URL!;
  const cleanUrl = rawUrl.replace(/[?&]pgbouncer=true/gi, '').replace(/[?&]connect_timeout=\d+/gi, '');
  const pool = new Pool({ connectionString: cleanUrl });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
