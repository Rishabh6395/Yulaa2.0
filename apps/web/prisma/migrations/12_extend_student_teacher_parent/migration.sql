-- ── Teachers ──────────────────────────────────────────────────────────────
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS date_of_birth    DATE,
  ADD COLUMN IF NOT EXISTS gender           VARCHAR(10),
  ADD COLUMN IF NOT EXISTS aadhaar_no       VARCHAR(12),
  ADD COLUMN IF NOT EXISTS pan_no           VARCHAR(10),
  ADD COLUMN IF NOT EXISTS category         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS employment_type  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS designation_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS teacher_cert     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS languages_known  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS pf_account_no    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS bank_account_no  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS bank_ifsc        VARCHAR(11),
  ADD COLUMN IF NOT EXISTS ib_certified     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_permit_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS passport_no      VARCHAR(20);

-- ── Students ──────────────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS middle_name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS roll_no            VARCHAR(30),
  ADD COLUMN IF NOT EXISTS sr_no              VARCHAR(30),
  ADD COLUMN IF NOT EXISTS category           VARCHAR(50),
  ADD COLUMN IF NOT EXISTS religion           VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nationality        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mother_tongue      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS house_id           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stream             VARCHAR(50),
  ADD COLUMN IF NOT EXISTS admission_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS boarding_type      VARCHAR(30),
  ADD COLUMN IF NOT EXISTS diet_type          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS disability_type    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS learning_support   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS transport_route_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bus_stop           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS doctor_name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS doctor_phone       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100),
  ADD COLUMN IF NOT EXISTS passport_no        VARCHAR(20);

-- ── Parents ───────────────────────────────────────────────────────────────
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS date_of_birth     DATE,
  ADD COLUMN IF NOT EXISTS gender            VARCHAR(10),
  ADD COLUMN IF NOT EXISTS aadhaar_no        VARCHAR(12),
  ADD COLUMN IF NOT EXISTS pan_no            VARCHAR(10),
  ADD COLUMN IF NOT EXISTS nationality       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS annual_income     VARCHAR(30),
  ADD COLUMN IF NOT EXISTS highest_education VARCHAR(100),
  ADD COLUMN IF NOT EXISTS organization      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS alternate_phone   VARCHAR(20);

-- ── Admission tables — custom field values (Issue 4 fix) ──────────────────
ALTER TABLE admission_applications
  ADD COLUMN IF NOT EXISTS custom_field_values JSONB;

ALTER TABLE admission_children
  ADD COLUMN IF NOT EXISTS custom_field_values JSONB;

-- ── grade_masters — needed by admission validator (Issue 4 fix) ───────────
CREATE TABLE IF NOT EXISTS grade_masters (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   VARCHAR      NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        VARCHAR(50)  NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- ── form_configs — needed by useFormConfig hook (Issue 1 fix) ────────────
CREATE TABLE IF NOT EXISTS form_configs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   VARCHAR      NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  form_id     VARCHAR(50)  NOT NULL,
  role        VARCHAR(30)  NOT NULL DEFAULT 'applicant',
  field_rules JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, form_id, role)
);

-- ── content_type_masters — needed by form-config/public API (Issue 1 fix) ─
CREATE TABLE IF NOT EXISTS content_type_masters (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   VARCHAR      NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  form_name   VARCHAR(100) NOT NULL,
  field_slot  VARCHAR(30)  NOT NULL,
  field_type  VARCHAR(20)  NOT NULL DEFAULT 'text',
  label       VARCHAR(100) NOT NULL,
  options     TEXT[]       NOT NULL DEFAULT '{}',
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, form_name, field_slot)
);
