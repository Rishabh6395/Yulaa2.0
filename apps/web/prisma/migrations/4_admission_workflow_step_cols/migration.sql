-- Migration: Add missing columns to admission_workflow_steps
-- These fields were added to the Prisma schema but were missing from the initial migration.

ALTER TABLE "admission_workflow_steps"
  ADD COLUMN IF NOT EXISTS "initiator_role" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "system_trigger"  VARCHAR(300),
  ADD COLUMN IF NOT EXISTS "email_enabled"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notify_enabled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notify_message"  VARCHAR(300),
  ADD COLUMN IF NOT EXISTS "is_final"        BOOLEAN NOT NULL DEFAULT false;
