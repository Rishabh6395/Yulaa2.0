-- Add priority column to SupportQuery
ALTER TABLE "support_queries"
  ADD COLUMN IF NOT EXISTS "priority" VARCHAR(20) NOT NULL DEFAULT 'normal';

-- Add attachments column to SupportQueryReply
ALTER TABLE "support_query_replies"
  ADD COLUMN IF NOT EXISTS "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Create QuerySlaPolicy table
CREATE TABLE IF NOT EXISTS "query_sla_policies" (
    "id"               TEXT NOT NULL,
    "priority"         VARCHAR(20) NOT NULL,
    "response_hours"   INTEGER NOT NULL DEFAULT 24,
    "resolution_hours" INTEGER NOT NULL DEFAULT 72,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_sla_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "query_sla_policies_priority_key" ON "query_sla_policies"("priority");

-- Seed default SLA policies
INSERT INTO "query_sla_policies" ("id", "priority", "response_hours", "resolution_hours", "updated_at")
VALUES
  (gen_random_uuid()::text, 'urgent', 4,  24,  NOW()),
  (gen_random_uuid()::text, 'high',   8,  48,  NOW()),
  (gen_random_uuid()::text, 'normal', 24, 72,  NOW()),
  (gen_random_uuid()::text, 'low',    48, 120, NOW())
ON CONFLICT ("priority") DO NOTHING;
