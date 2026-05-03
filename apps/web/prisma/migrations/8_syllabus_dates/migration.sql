-- Add start/end date columns to syllabus_items
ALTER TABLE "syllabus_items" ADD COLUMN IF NOT EXISTS "start_date" DATE;
ALTER TABLE "syllabus_items" ADD COLUMN IF NOT EXISTS "end_date" DATE;
