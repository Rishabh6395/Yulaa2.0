/**
 * Seeds new roles (employee, hod, principal) into the database.
 * Safe to run multiple times — uses upsert.
 *
 * Run with:
 *   npx tsx --env-file=.env src/scripts/seed-roles.ts
 */

import 'dotenv/config';
import prisma from '../lib/prisma';

const NEW_ROLES = [
  { code: 'employee',  displayName: 'Employee',   description: 'School employee (Teacher, HOD, Principal, Admin)' },
  { code: 'hod',       displayName: 'HOD',         description: 'Head of Department' },
  { code: 'principal', displayName: 'Principal',   description: 'School Principal' },
];

async function main() {
  console.log('Seeding new roles...\n');
  for (const role of NEW_ROLES) {
    const result = await prisma.role.upsert({
      where:  { code: role.code },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
    console.log(`  ✓ ${result.code} (${result.id})`);
  }
  console.log('\nDone.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
