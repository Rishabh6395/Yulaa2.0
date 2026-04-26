-- Migration: Add class_id to stream_masters
-- Allows subjects to be linked to a specific class (grade + section)

ALTER TABLE "stream_masters" ADD COLUMN "class_id" TEXT REFERENCES "classes"("id") ON DELETE CASCADE;

-- Drop old unique constraint (schoolId, name)
ALTER TABLE "stream_masters" DROP CONSTRAINT IF EXISTS "stream_masters_school_id_name_key";

-- Add new unique constraint (schoolId, classId, name)
-- NULL classId values are treated as distinct in Postgres, so school-wide
-- entries (classId IS NULL) can coexist without conflicting with each other.
CREATE UNIQUE INDEX "stream_masters_school_id_class_id_name_key"
  ON "stream_masters" ("school_id", "class_id", "name");

-- Index for fast lookup by class
CREATE INDEX "stream_masters_class_id_idx" ON "stream_masters" ("class_id");
