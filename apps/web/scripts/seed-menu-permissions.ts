/**
 * Seeds default menu permissions for all schools.
 * Enables full menu access for school_admin, principal, and teacher.
 * Safe to run multiple times (upsert logic).
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

const ROLE_MENUS: Record<string, string[]> = {
  school_admin: [
    'dashboard', 'masters', 'admissions', 'classes', 'students', 'teachers', 'parents',
    'attendance', 'fees', 'scheduling', 'events', 'exam', 'syllabus', 'school_inventory',
    'letter_templates', 'announcements', 'leave', 'queries', 'transport', 'performance',
    'sessions', 'vendor', 'compliance', 'reports', 'settings',
    'online_classes', 'courses',
  ],
  principal: [
    'dashboard', 'admissions', 'classes', 'students', 'teachers', 'attendance', 'fees',
    'events', 'exam', 'syllabus', 'school_inventory', 'letter_templates', 'announcements',
    'leave', 'queries', 'transport', 'compliance', 'reports', 'settings',
    'online_classes', 'courses', 'sessions',
  ],
  teacher: [
    'dashboard', 'attendance', 'timetable', 'performance', 'homework', 'syllabus',
    'events', 'exam', 'leave', 'queries', 'online_classes', 'courses', 'settings',
  ],
  student: [
    'dashboard', 'attendance', 'fees', 'homework', 'timetable', 'syllabus', 'exam',
    'events', 'announcements', 'queries', 'online_classes', 'courses',
  ],
  parent: [
    'dashboard', 'admissions', 'attendance', 'fees', 'performance', 'homework',
    'timetable', 'syllabus', 'exam', 'events', 'announcements', 'leave', 'queries',
    'sessions', 'vendor', 'online_classes', 'courses', 'transport',
  ],
  hod: [
    'dashboard', 'students', 'teachers', 'classes', 'attendance', 'homework', 'syllabus',
    'exam', 'performance', 'events', 'announcements', 'leave', 'queries', 'reports', 'settings',
  ],
};

async function main() {
  console.log('Seeding menu permissions...');

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  console.log(`  Found ${schools.length} school(s)`);

  for (const school of schools) {
    for (const [roleCode, menuKeys] of Object.entries(ROLE_MENUS)) {
      // Delete existing and re-insert
      await prisma.menuPermission.deleteMany({ where: { schoolId: school.id, roleCode } });
      await prisma.menuPermission.createMany({
        data: menuKeys.map(menuKey => ({
          schoolId: school.id,
          roleCode,
          menuKey,
          enabled: true,
        })),
      });
    }
    console.log(`  Configured menu permissions for: ${school.name}`);
  }

  console.log('Done!');
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
