-- Migration: Events, Syllabus, Exams, Inventory, Event Type Masters

-- ─── Event Type Masters ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_type_masters (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id   TEXT        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(30)  NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, code)
);
CREATE INDEX IF NOT EXISTS idx_event_type_masters_school ON event_type_masters(school_id);

-- ─── School Events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_events (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id     TEXT        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  event_type    VARCHAR(50)  NOT NULL,
  start_date    TIMESTAMPTZ  NOT NULL,
  end_date      TIMESTAMPTZ  NOT NULL,
  venue         VARCHAR(200),
  status        VARCHAR(20)  NOT NULL DEFAULT 'upcoming',
  academic_year VARCHAR(9)   NOT NULL,
  created_by    TEXT        NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_events_school ON school_events(school_id);
CREATE INDEX IF NOT EXISTS idx_school_events_school_year ON school_events(school_id, academic_year);

-- ─── Event Tasks ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_tasks (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id    TEXT        NOT NULL REFERENCES school_events(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to TEXT        REFERENCES teachers(id),
  role        VARCHAR(100),
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_tasks_event ON event_tasks(event_id);

-- ─── Event Participants ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_participants (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id   TEXT        NOT NULL REFERENCES school_events(id) ON DELETE CASCADE,
  student_id TEXT        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status     VARCHAR(20)  NOT NULL DEFAULT 'registered',
  role       VARCHAR(100),
  attended   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);

-- ─── Syllabus Items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syllabus_items (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id     TEXT        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id      TEXT        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject       VARCHAR(100) NOT NULL,
  chapter       VARCHAR(200) NOT NULL,
  topic         VARCHAR(200) NOT NULL,
  order_no      INT         NOT NULL DEFAULT 0,
  academic_year VARCHAR(9)   NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  completed_at  TIMESTAMPTZ,
  teacher_id    TEXT        REFERENCES teachers(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_syllabus_items_school_class ON syllabus_items(school_id, class_id, subject);

-- ─── Exams ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id     TEXT        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  exam_type     VARCHAR(50)  NOT NULL,
  academic_year VARCHAR(9)   NOT NULL,
  class_id      TEXT        REFERENCES classes(id),
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  grading_type  VARCHAR(20)  NOT NULL DEFAULT 'percentage',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exams_school ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school_year ON exams(school_id, academic_year);

-- ─── Exam Timetable Entries ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_timetable_entries (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exam_id    TEXT        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id   TEXT        NOT NULL REFERENCES classes(id),
  subject    VARCHAR(100) NOT NULL,
  date       DATE        NOT NULL,
  start_time VARCHAR(10)  NOT NULL,
  end_time   VARCHAR(10)  NOT NULL,
  max_marks  INT         NOT NULL,
  venue      VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, class_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_exam_timetable_exam ON exam_timetable_entries(exam_id);

-- ─── Exam Results ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_results (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exam_id         TEXT        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id      TEXT        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject         VARCHAR(100) NOT NULL,
  marks_obtained  DECIMAL(6,2) NOT NULL,
  max_marks       INT         NOT NULL,
  grade           VARCHAR(5),
  remarks         VARCHAR(200),
  entered_by_id   TEXT        NOT NULL REFERENCES users(id),
  approved        BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_by_id  TEXT        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, student_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);

-- ─── Inventory ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id   TEXT        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  unit        VARCHAR(20)  NOT NULL DEFAULT 'piece',
  min_stock   INT         NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_school ON inventory_items(school_id);

CREATE TABLE IF NOT EXISTS inventory_stock (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_id    TEXT        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity   INT         NOT NULL DEFAULT 0,
  location   VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id)
);
