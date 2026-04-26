-- Migration: Add section column to admission_children
-- Allows reviewers to assign a class section during the review process.

ALTER TABLE "admission_children"
  ADD COLUMN IF NOT EXISTS "section" VARCHAR(10);
