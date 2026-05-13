ALTER TABLE "admission_applications"
  ADD COLUMN IF NOT EXISTS "residential_address" TEXT,
  ADD COLUMN IF NOT EXISTS "permanent_address"   TEXT;
