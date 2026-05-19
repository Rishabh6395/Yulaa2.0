import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL!;
const cleanUrl = connectionString.replace(/[?&]pgbouncer=true/i, '').replace(/[?&]connect_timeout=\d+/i, '');
const pool = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const hash = await bcrypt.hash('demo', 12);

  const result = await prisma.user.updateMany({
    data: { passwordHash: hash, mustResetPassword: false },
  });

  console.log(`✓ Updated ${result.count} users — password is now "demo" for all`);

  const users = await prisma.user.findMany({
    select: {
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      userRoles: { select: { role: { select: { code: true } }, school: { select: { name: true } }, isPrimary: true } },
    },
    orderBy: { email: 'asc' },
  });

  console.log('\nUser list:');
  for (const u of users) {
    const primary = u.userRoles.find(r => r.isPrimary) ?? u.userRoles[0];
    const role = primary?.role?.code ?? 'no-role';
    const school = primary?.school?.name ?? 'global';
    console.log(`  ${u.email.padEnd(45)} [${role}] @ ${school}  (${u.status})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
