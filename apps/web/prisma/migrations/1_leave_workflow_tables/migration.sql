-- AlterTable: add missing columns to leave_requests
ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "current_step" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "leave_type"   VARCHAR(50) NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS "student_id"   TEXT;

-- AddForeignKey for student_id (only if students table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leave_requests_student_id_fkey'
  ) THEN
    ALTER TABLE "leave_requests"
      ADD CONSTRAINT "leave_requests_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: leave_actions
CREATE TABLE IF NOT EXISTS "leave_actions" (
    "id"            TEXT NOT NULL,
    "leave_id"      TEXT NOT NULL,
    "actor_user_id" TEXT,
    "step_order"    INTEGER NOT NULL,
    "action"        VARCHAR(20) NOT NULL,
    "comment"       TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leave_actions_leave_id_idx" ON "leave_actions"("leave_id");

ALTER TABLE "leave_actions"
  DROP CONSTRAINT IF EXISTS "leave_actions_leave_id_fkey";
ALTER TABLE "leave_actions"
  ADD CONSTRAINT "leave_actions_leave_id_fkey"
  FOREIGN KEY ("leave_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leave_actions_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "leave_actions"
      ADD CONSTRAINT "leave_actions_actor_user_id_fkey"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: leave_workflows
CREATE TABLE IF NOT EXISTS "leave_workflows" (
    "id"         TEXT NOT NULL,
    "school_id"  TEXT NOT NULL,
    "type"       VARCHAR(20) NOT NULL,
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_workflows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_workflows_school_id_type_key" ON "leave_workflows"("school_id", "type");
CREATE INDEX IF NOT EXISTS "leave_workflows_school_id_idx" ON "leave_workflows"("school_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leave_workflows_school_id_fkey'
  ) THEN
    ALTER TABLE "leave_workflows"
      ADD CONSTRAINT "leave_workflows_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: leave_workflow_steps
CREATE TABLE IF NOT EXISTS "leave_workflow_steps" (
    "id"               TEXT NOT NULL,
    "workflow_id"      TEXT NOT NULL,
    "step_order"       INTEGER NOT NULL,
    "label"            VARCHAR(100) NOT NULL,
    "approver_role"    VARCHAR(30),
    "approver_user_id" TEXT,
    "email_enabled"    BOOLEAN NOT NULL DEFAULT false,
    "notify_enabled"   BOOLEAN NOT NULL DEFAULT true,
    "notify_message"   VARCHAR(300),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- Add columns that were missing from initial CREATE TABLE
ALTER TABLE "leave_workflow_steps"
  ADD COLUMN IF NOT EXISTS "initiator_role" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "system_trigger" VARCHAR(300);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_workflow_steps_workflow_id_step_order_key" ON "leave_workflow_steps"("workflow_id", "step_order");
CREATE INDEX IF NOT EXISTS "leave_workflow_steps_workflow_id_idx" ON "leave_workflow_steps"("workflow_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leave_workflow_steps_workflow_id_fkey'
  ) THEN
    ALTER TABLE "leave_workflow_steps"
      ADD CONSTRAINT "leave_workflow_steps_workflow_id_fkey"
      FOREIGN KEY ("workflow_id") REFERENCES "leave_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: leave_type_masters
CREATE TABLE IF NOT EXISTS "leave_type_masters" (
    "id"            TEXT NOT NULL,
    "school_id"     TEXT NOT NULL,
    "name"          VARCHAR(100) NOT NULL,
    "code"          VARCHAR(30) NOT NULL,
    "applicable_to" TEXT[] NOT NULL,
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_type_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_type_masters_school_id_code_key" ON "leave_type_masters"("school_id", "code");
CREATE INDEX IF NOT EXISTS "leave_type_masters_school_id_idx" ON "leave_type_masters"("school_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leave_type_masters_school_id_fkey'
  ) THEN
    ALTER TABLE "leave_type_masters"
      ADD CONSTRAINT "leave_type_masters_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: leave_balance_policies
CREATE TABLE IF NOT EXISTS "leave_balance_policies" (
    "id"               TEXT NOT NULL,
    "school_id"        TEXT NOT NULL,
    "leave_type_id"    TEXT NOT NULL,
    "role_code"        VARCHAR(30) NOT NULL,
    "days_per_year"    INTEGER NOT NULL DEFAULT 0,
    "carry_forward"    BOOLEAN NOT NULL DEFAULT false,
    "max_carry_days"   INTEGER NOT NULL DEFAULT 0,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_balance_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_balance_policies_school_id_leave_type_id_role_code_key" ON "leave_balance_policies"("school_id", "leave_type_id", "role_code");
CREATE INDEX IF NOT EXISTS "leave_balance_policies_school_id_role_code_idx" ON "leave_balance_policies"("school_id", "role_code");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leave_balance_policies_leave_type_id_fkey'
  ) THEN
    ALTER TABLE "leave_balance_policies"
      ADD CONSTRAINT "leave_balance_policies_leave_type_id_fkey"
      FOREIGN KEY ("leave_type_id") REFERENCES "leave_type_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leave_balance_policies_school_id_fkey'
  ) THEN
    ALTER TABLE "leave_balance_policies"
      ADD CONSTRAINT "leave_balance_policies_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: teacher_leave_balances
CREATE TABLE IF NOT EXISTS "teacher_leave_balances" (
    "id"           TEXT NOT NULL,
    "school_id"    TEXT NOT NULL,
    "teacher_id"   TEXT NOT NULL,
    "leave_type"   VARCHAR(50) NOT NULL,
    "academic_year" VARCHAR(9) NOT NULL DEFAULT '2024-25',
    "total_days"   INTEGER NOT NULL DEFAULT 0,
    "used_days"    INTEGER NOT NULL DEFAULT 0,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teacher_leave_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_leave_balances_school_id_teacher_id_leave_type_academic_year_key"
  ON "teacher_leave_balances"("school_id", "teacher_id", "leave_type", "academic_year");
CREATE INDEX IF NOT EXISTS "teacher_leave_balances_school_id_teacher_id_idx" ON "teacher_leave_balances"("school_id", "teacher_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teacher_leave_balances_school_id_fkey'
  ) THEN
    ALTER TABLE "teacher_leave_balances"
      ADD CONSTRAINT "teacher_leave_balances_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teacher_leave_balances_teacher_id_fkey'
  ) THEN
    ALTER TABLE "teacher_leave_balances"
      ADD CONSTRAINT "teacher_leave_balances_teacher_id_fkey"
      FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
