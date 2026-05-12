# Yulaa 2.0 — Comprehensive Test Report

> **Run date:** 2026-05-11  
> **Framework:** Vitest v4.1.6  
> **Result: ✅ 124 / 124 tests PASSED · 11 test files · 0 failures**

---

## Overview

Full role-based access-control (RBAC) test suite covering all major API modules. Each module is tested for:
- **Positive paths** (`[+]`) — allowed operations per role
- **Negative paths** (`[-]`) — blocked operations, input validation, cross-school isolation

### Roles Tested
| Role | Description |
|------|-------------|
| `super_admin` | Platform-wide admin — sees all schools |
| `school_admin` | School-level admin — full CRUD within own school |
| `principal` / `hod` | Management roles — approve workflows |
| `teacher` | Staff — read-heavy, limited write |
| `parent` | End-user — read-only for own children |
| `unauthenticated` | No token — all routes return 401 |

---

## 🔐 AUTH MODULE — 7 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Returns JWT token for valid credentials | — | ✅ |
| 2 | Allows super_admin login with no school_id | — | ✅ |
| 3 | Returns 401 for non-existent user | — | ✅ |
| 4 | Returns 401 for wrong password | — | ✅ |
| 5 | Returns 401 for inactive account | — | ✅ |
| 6 | Returns 400 for missing email | — | ✅ |
| 7 | Returns 400 for missing password | — | ✅ |

---

## 🎓 STUDENTS MODULE — 10 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can list students from any school via school_id | super_admin | ✅ |
| 2 | Can create a student in any school | super_admin | ✅ |
| 3 | Can list own school students | school_admin | ✅ |
| 4 | Can create student in own school | school_admin | ✅ |
| 5 | Cannot create student without required fields | school_admin | ✅ |
| 6 | Can view students in their school (read-only) | teacher | ✅ |
| 7 | Cannot create a student (service enforces restriction) | teacher | ✅ |
| 8 | Cannot access student list (service enforces restriction) | parent | ✅ |
| 9 | GET returns 401 | unauthenticated | ✅ |
| 10 | POST returns 401 | unauthenticated | ✅ |

---

## 📅 ATTENDANCE MODULE — 9 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can fetch attendance records for own school | school_admin | ✅ |
| 2 | Can mark attendance for a student | school_admin | ✅ |
| 3 | Cannot mark attendance for student from another school | school_admin | ✅ |
| 4 | Can view and mark attendance for their class | teacher | ✅ |
| 5 | Can mark student absent | teacher | ✅ |
| 6 | Cannot mark attendance with invalid status | teacher | ✅ |
| 7 | Can view attendance for own child (with student_id) | parent | ✅ |
| 8 | Cannot mark attendance | parent | ✅ |
| 9 | GET returns 401 / POST returns 401 | unauthenticated | ✅ |

---

## 🏖️ LEAVE MODULE — 10 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can apply for leave | teacher | ✅ |
| 2 | Can view own leave requests | teacher | ✅ |
| 3 | Cannot apply with invalid dates (end before start) | teacher | ✅ |
| 4 | Cannot apply without leave type | teacher | ✅ |
| 5 | Can view all leave requests for school | school_admin | ✅ |
| 6 | Can approve leave requests via PATCH | school_admin | ✅ |
| 7 | Can reject leave requests via PATCH | school_admin | ✅ |
| 8 | Cannot approve leave from another school | school_admin | ✅ |
| 9 | Cannot access leave API without child_id / submit request | parent | ✅ |
| 10 | GET returns 401 / POST returns 401 | unauthenticated | ✅ |

---

## 💰 FEES MODULE — 11 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can list all fee invoices for own school | school_admin | ✅ |
| 2 | Can create a fee invoice | school_admin | ✅ |
| 3 | Can filter by status=pending | school_admin | ✅ |
| 4 | Cannot create invoice with missing required fields | school_admin | ✅ |
| 5 | Cannot create invoice for non-existent student | school_admin | ✅ |
| 6 | Can upsert fee structure (admin action) | school_admin | ✅ |
| 7 | Can view fee invoices | parent | ✅ |
| 8 | Cannot upsert fee structures (admin-only) | parent | ✅ |
| 9 | Cannot upsert fee structures (admin-only) | teacher | ✅ |
| 10 | Cannot apply bulk fees (admin-only) | teacher | ✅ |
| 11 | GET returns 401 / POST returns 401 | unauthenticated | ✅ |

---

## 📊 PERFORMANCE MODULE — 12 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can view all-schools performance summary | super_admin | ✅ |
| 2 | Can drill into a specific school | super_admin | ✅ |
| 3 | Non-super-admin cannot access super_admin view | school_admin | ✅ |
| 4 | Can view admin performance dashboard | school_admin | ✅ |
| 5 | Can filter by class in admin view | school_admin | ✅ |
| 6 | Returns empty classStats when no exams exist | school_admin | ✅ |
| 7 | Can view teacher performance dashboard | teacher | ✅ |
| 8 | Teacher with no record returns error | teacher | ✅ |
| 9 | Can view own child performance | parent | ✅ |
| 10 | Cannot view another parent's child | parent | ✅ |
| 11 | Returns 400 when student_id is missing | parent | ✅ |
| 12 | GET returns 401 | unauthenticated | ✅ |

---

## 🚌 TRANSPORT MODULE — 20 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can list all rides for school | school_admin | ✅ |
| 2 | Can list own rides only | teacher | ✅ |
| 3 | Can view rides for own children | parent | ✅ |
| 4 | GET returns 401 | unauthenticated | ✅ |
| 5 | Can create a ride with valid route and students | teacher | ✅ |
| 6 | Cannot create ride without routeId | teacher | ✅ |
| 7 | Cannot create ride with empty studentIds | teacher | ✅ |
| 8 | Cannot create ride with route from another school | teacher | ✅ |
| 9 | Cannot create ride with students from another school | teacher | ✅ |
| 10 | Unauthenticated cannot create ride | unauthenticated | ✅ |
| 11 | Can get ride detail | school_admin | ✅ |
| 12 | Cannot access ride from another school | school_admin | ✅ |
| 13 | Returns 404 for non-existent ride | school_admin | ✅ |
| 14 | Can depart (start) a pending ride | teacher | ✅ |
| 15 | Cannot depart a ride that is already active | teacher | ✅ |
| 16 | Can complete an active ride | teacher | ✅ |
| 17 | Cannot complete a pending ride | teacher | ✅ |
| 18 | Can cancel a ride | teacher | ✅ |
| 19 | Can mark student pickup | teacher | ✅ |
| 20 | Student pickup fails if student not on ride | teacher | ✅ |
| 21 | Can update GPS location | teacher | ✅ |
| 22 | Unknown action returns 400 | teacher | ✅ |
| 23 | Unauthenticated returns 401 | unauthenticated | ✅ |

---

## 📊 REPORTS / EXPORT MODULE — 10 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can export students report as Excel | school_admin | ✅ |
| 2 | Can export attendance report | school_admin | ✅ |
| 3 | Can export fees report | school_admin | ✅ |
| 4 | Can export admissions report | school_admin | ✅ |
| 5 | Can export leave report | school_admin | ✅ |
| 6 | Can export homework report | school_admin | ✅ |
| 7 | Unknown export type returns 400 | school_admin | ✅ |
| 8 | Cannot export reports | teacher | ✅ |
| 9 | Cannot export reports | parent | ✅ |
| 10 | GET returns 401 | unauthenticated | ✅ |

---

## 📚 HOMEWORK MODULE — 8 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can list homework for own school | school_admin | ✅ |
| 2 | Can create homework | school_admin | ✅ |
| 3 | Can update/publish homework | school_admin | ✅ |
| 4 | Can list homework for own school | teacher | ✅ |
| 5 | Can create homework | teacher | ✅ |
| 6 | Can view homework (read-only) | parent | ✅ |
| 7 | GET returns 401 | unauthenticated | ✅ |
| 8 | POST returns 401 | unauthenticated | ✅ |

---

## 📢 ANNOUNCEMENTS MODULE — 10 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can list announcements for own school | school_admin | ✅ |
| 2 | Can create an announcement | school_admin | ✅ |
| 3 | Can delete an announcement | school_admin | ✅ |
| 4 | Can list announcements (read-only) | teacher | ✅ |
| 5 | Cannot create an announcement | teacher | ✅ |
| 6 | Cannot delete an announcement | teacher | ✅ |
| 7 | Can view announcements (read-only) | parent | ✅ |
| 8 | Cannot create announcements | parent | ✅ |
| 9 | GET returns 401 | unauthenticated | ✅ |
| 10 | POST returns 401 | unauthenticated | ✅ |

---

## ✅ COMPLIANCE MODULE — 10 tests

| # | Test | User | Status |
|---|------|------|--------|
| 1 | Can list compliance items | school_admin | ✅ |
| 2 | Can view compliance dashboard | school_admin | ✅ |
| 3 | Can filter compliance items by category | school_admin | ✅ |
| 4 | Can add a compliance item | school_admin | ✅ |
| 5 | Can seed default compliance checklist | school_admin | ✅ |
| 6 | Cannot access compliance module | teacher | ✅ |
| 7 | Cannot create compliance items | teacher | ✅ |
| 8 | Cannot access compliance module | parent | ✅ |
| 9 | GET returns 401 | unauthenticated | ✅ |
| 10 | POST returns 401 | unauthenticated | ✅ |

---

## Test Infrastructure

### Mock Strategy
- **Prisma**: All database calls intercepted via `vi.mock('@/lib/prisma')` — no real DB connection required
- **Auth**: `getUserFromRequest` mocked via `vi.mock('@/lib/auth')` — `setUser()` sets the active role per test
- **Services**: Complex business-logic services mocked at the module boundary when they have external dependencies (leave, attendance, homework, announcements, compliance, students, fees)
- **ExcelJS**: Mocked with in-memory workbook for report export tests

### Running Tests
```bash
# From apps/web directory
npx vitest run                     # Run all tests
npx vitest run --reporter=verbose  # Verbose with test names
npx vitest watch                   # Watch mode
```

### Test File Structure
```
apps/web/src/tests/
├── mocks/
│   ├── auth.ts        # User role fixtures + getUserFromRequest mock
│   └── prisma.ts      # Full Prisma mock with all model delegates
├── setup.ts           # Global setup (suppress console noise)
├── auth.test.ts
├── students.test.ts
├── attendance.test.ts
├── leave.test.ts
├── fees.test.ts
├── performance.test.ts
├── transport.test.ts
├── reports.test.ts
├── homework.test.ts
├── announcements.test.ts
└── compliance.test.ts
```
