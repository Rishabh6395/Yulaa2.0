/**
 * Seeds Product Category custom master for all schools.
 * Safe to run multiple times (upsert logic).
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

const CATEGORIES = [
  'Books', 'Uniform', 'Stationery', 'Sports Equipment',
  'Lanyard', 'Lab Supplies', 'Art & Craft', 'Electronics', 'Other',
];

async function main() {
  console.log('Seeding Product Category master...');

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  console.log(`  Found ${schools.length} school(s)`);

  for (const school of schools) {
    // Upsert the GenericMasterType
    const existing = await prisma.genericMasterType.findUnique({
      where: { schoolId_slug: { schoolId: school.id, slug: 'product_category' } },
    });

    let masterType = existing;
    if (!masterType) {
      masterType = await prisma.genericMasterType.create({
        data: {
          schoolId:    school.id,
          name:        'Product Category',
          slug:        'product_category',
          description: 'Categories for vendor products',
          formId:      'vendor_form',
          fieldSlot:   'category',
        },
      });
      console.log(`  Created master type for: ${school.name}`);
    } else {
      console.log(`  Master type already exists for: ${school.name}`);
    }

    // Upsert values
    for (let i = 0; i < CATEGORIES.length; i++) {
      const name = CATEGORIES[i];
      const existing = await prisma.genericMasterValue.findFirst({
        where: { typeId: masterType.id, name },
      });
      if (!existing) {
        await prisma.genericMasterValue.create({
          data: { typeId: masterType.id, name, sortOrder: i + 1, isActive: true },
        });
      }
    }
    console.log(`  Seeded ${CATEGORIES.length} categories for: ${school.name}`);
  }

  console.log('Done!');
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
