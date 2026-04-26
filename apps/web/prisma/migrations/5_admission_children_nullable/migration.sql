-- Migration: Make date_of_birth, gender, class_applying nullable in admission_children
-- The Prisma schema marks these as optional but the DB had NOT NULL constraints.

ALTER TABLE "admission_children"
  ALTER COLUMN "date_of_birth" DROP NOT NULL,
  ALTER COLUMN "gender"        DROP NOT NULL,
  ALTER COLUMN "class_applying" DROP NOT NULL;
