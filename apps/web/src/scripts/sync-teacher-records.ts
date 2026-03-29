/**
 * Backfill missing Teacher records for users who have the 'teacher' role
 * but no corresponding row in the Teacher table.
 *
 * Run with:
 *   npx tsx --env-file=.env src/scripts/sync-teacher-records.ts
 */

import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log('Syncing Teacher records...\n');

  // Find all UserRoles where role code = 'teacher' and schoolId is set
  const teacherUserRoles = await prisma.userRole.findMany({
    where: {
      role:     { code: 'teacher' },
      schoolId: { not: null },
    },
    select: { userId: true, schoolId: true },
  });

  console.log(`Found ${teacherUserRoles.length} teacher role assignments\n`);

  let created = 0;
  let skipped = 0;

  for (const ur of teacherUserRoles) {
    const schoolId = ur.schoolId!;
    const existing = await prisma.teacher.findFirst({
      where: { userId: ur.userId, schoolId },
    });

    if (!existing) {
      await prisma.teacher.create({ data: { userId: ur.userId, schoolId } });
      created++;
      console.log(`  ✓ Created Teacher record for userId=${ur.userId} schoolId=${schoolId}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. ${created} Teacher records created, ${skipped} already existed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
