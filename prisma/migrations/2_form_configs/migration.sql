-- Form configuration per school, form, and role
CREATE TABLE IF NOT EXISTS "form_configs" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "school_id"    TEXT         NOT NULL,
  "form_id"      VARCHAR(50)  NOT NULL,
  "role"         VARCHAR(30)  NOT NULL DEFAULT 'admin',
  "field_rules"  JSONB        NOT NULL DEFAULT '{}',
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "form_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "form_configs_school_id_form_id_role_key" UNIQUE ("school_id", "form_id", "role"),
  CONSTRAINT "form_configs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "form_configs_school_id_form_id_idx" ON "form_configs"("school_id", "form_id");
