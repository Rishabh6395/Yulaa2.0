-- Phase 1: Master Data (15 Masters)
-- Global lookup masters (no school_id)

CREATE TABLE "gender_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(50)  NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "gender_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gender_masters_name_key" UNIQUE ("name")
);

CREATE TABLE "blood_group_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(10)  NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "blood_group_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blood_group_masters_name_key" UNIQUE ("name")
);

CREATE TABLE "qualification_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(100) NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "qualification_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "qualification_masters_name_key" UNIQUE ("name")
);

CREATE TABLE "stream_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(100) NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "stream_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stream_masters_name_key" UNIQUE ("name")
);

CREATE TABLE "event_type_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(100) NOT NULL,
  "code"       VARCHAR(30)  NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "event_type_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_type_masters_code_key" UNIQUE ("code")
);

-- Location masters (cascading: Country → State → District)

CREATE TABLE "country_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(100) NOT NULL,
  "code"       VARCHAR(3)   NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "country_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "country_masters_code_key" UNIQUE ("code")
);

CREATE TABLE "state_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "country_id" UUID         NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "code"       VARCHAR(10),
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "state_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "state_masters_country_id_name_key" UNIQUE ("country_id", "name"),
  CONSTRAINT "state_masters_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "state_masters_country_id_idx" ON "state_masters"("country_id");

CREATE TABLE "district_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "state_id"   UUID         NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "district_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "district_masters_state_id_name_key" UNIQUE ("state_id", "name"),
  CONSTRAINT "district_masters_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "state_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "district_masters_state_id_idx" ON "district_masters"("state_id");

-- School-specific masters

CREATE TABLE "school_location_masters" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "school_id"   UUID         NOT NULL,
  "address"     TEXT         NOT NULL,
  "city"        VARCHAR(100),
  "pincode"     VARCHAR(10),
  "country_id"  UUID,
  "state_id"    UUID,
  "district_id" UUID,
  "is_active"   BOOLEAN      NOT NULL DEFAULT true,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "school_location_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "school_location_masters_school_id_fkey"   FOREIGN KEY ("school_id")   REFERENCES "schools"("id")           ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "school_location_masters_country_id_fkey"  FOREIGN KEY ("country_id")  REFERENCES "country_masters"("id")   ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "school_location_masters_state_id_fkey"    FOREIGN KEY ("state_id")    REFERENCES "state_masters"("id")     ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "school_location_masters_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "district_masters"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "school_location_masters_school_id_idx" ON "school_location_masters"("school_id");

CREATE TABLE "school_hierarchy_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "school_id"  UUID         NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "level"      INTEGER      NOT NULL,
  "parent_id"  UUID,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "school_hierarchy_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "school_hierarchy_masters_school_id_fkey"  FOREIGN KEY ("school_id")  REFERENCES "schools"("id")                  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "school_hierarchy_masters_parent_id_fkey"  FOREIGN KEY ("parent_id")  REFERENCES "school_hierarchy_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "school_hierarchy_masters_school_id_idx" ON "school_hierarchy_masters"("school_id");

CREATE TABLE "exam_type_masters" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "school_id"   UUID         NOT NULL,
  "name"        VARCHAR(100) NOT NULL,
  "code"        VARCHAR(30)  NOT NULL,
  "term_order"  INTEGER      NOT NULL DEFAULT 0,
  "is_active"   BOOLEAN      NOT NULL DEFAULT true,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "exam_type_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_type_masters_school_id_code_key" UNIQUE ("school_id", "code"),
  CONSTRAINT "exam_type_masters_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "exam_type_masters_school_id_idx" ON "exam_type_masters"("school_id");

CREATE TABLE "grading_type_masters" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "school_id"    UUID          NOT NULL,
  "exam_type_id" UUID          NOT NULL,
  "grade"        VARCHAR(10)   NOT NULL,
  "min_percent"  DECIMAL(5, 2) NOT NULL,
  "max_percent"  DECIMAL(5, 2) NOT NULL,
  "grade_points" DECIMAL(4, 2),
  "description"  VARCHAR(100),
  "is_active"    BOOLEAN       NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT "grading_type_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "grading_type_masters_school_id_exam_type_id_grade_key" UNIQUE ("school_id", "exam_type_id", "grade"),
  CONSTRAINT "grading_type_masters_school_id_fkey"    FOREIGN KEY ("school_id")    REFERENCES "schools"("id")          ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "grading_type_masters_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_type_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "grading_type_masters_school_id_idx" ON "grading_type_masters"("school_id");

CREATE TABLE "announcement_type_masters" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "school_id"  UUID         NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "code"       VARCHAR(30)  NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "announcement_type_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "announcement_type_masters_school_id_code_key" UNIQUE ("school_id", "code"),
  CONSTRAINT "announcement_type_masters_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "announcement_type_masters_school_id_idx" ON "announcement_type_masters"("school_id");

CREATE TABLE "content_type_masters" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "school_id"   UUID         NOT NULL,
  "form_name"   VARCHAR(100) NOT NULL,
  "field_slot"  VARCHAR(30)  NOT NULL,
  "field_type"  VARCHAR(20)  NOT NULL DEFAULT 'text',
  "label"       VARCHAR(100) NOT NULL,
  "options"     TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active"   BOOLEAN      NOT NULL DEFAULT true,
  "sort_order"  INTEGER      NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "content_type_masters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_type_masters_school_id_form_name_field_slot_key" UNIQUE ("school_id", "form_name", "field_slot"),
  CONSTRAINT "content_type_masters_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "content_type_masters_school_id_form_name_idx" ON "content_type_masters"("school_id", "form_name");
