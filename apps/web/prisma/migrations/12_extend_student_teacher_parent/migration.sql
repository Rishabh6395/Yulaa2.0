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
