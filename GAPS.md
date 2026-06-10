# Yulaa 2.0 — Product Gap Report

**Audit date:** 2026-06-02  
**Auditor:** Claude (Senior SaaS Product Strategist + Principal Engineer)  
**Status:** Pre-production (internal testing only, no live schools)  
**Total gaps:** 52 | **Critical:** 13 | **High:** 24 | **Medium:** 15

---

## Severity Key
- `[CRITICAL]` — Blocks launch or causes data breach / legal liability. Fix before first school goes live.
- `[HIGH]` — Breaks a core user journey. Fix before scaling to 10+ schools.
- `[MEDIUM]` — Degrades experience or creates future tech debt. Fix before enterprise deals.

---

## PHASE 1 & 2: Auth, Security & Core Flows

| # | Gap | Severity | Impact | Effort | File:Line |
|---|-----|----------|--------|--------|-----------|
| G-001 | No `middleware.ts` — auth checked inline per route; one missed call = unprotected endpoint | [CRITICAL] | Data exposure risk | S | No middleware.ts exists |
| G-002 | No rate limiting on login, OTP request, OTP verify, forgot-password | [CRITICAL] | Brute force / credential stuffing / OTP enumeration | S | No rate-limit dep in package.json |
| G-003 | No account lockout after failed login attempts | [CRITICAL] | Unlimited brute force allowed | S | auth.service.ts — no attempt tracking |
| G-004 | No logout endpoint / token revocation | [HIGH] | Stolen JWT valid for 7 days | M | No `/api/auth/logout`, no token blacklist |
| G-005 | JWT expiry 7 days, no refresh token | [HIGH] | Long stolen-token window | S | apps/web/src/lib/auth.ts:4 |
| G-006 | Cookie tokens without HttpOnly/Secure flags | [HIGH] | XSS can steal auth tokens | S | apps/web/src/lib/auth.ts:55 |
| G-007 | Auto-Teacher record creation by any authenticated user | [HIGH] | Any user can self-enroll as employee at their school | S | apps/web/src/modules/attendance/attendance.service.ts:241-242 |
| G-008 | Dev OTP printed to console (captured by log aggregators) | [MEDIUM] | OTP leakage in staging/prod logs | XS | apps/web/src/modules/otp/otp.service.ts:63-67 |
| G-009 | No password complexity policy (only ≥8 chars) | [MEDIUM] | Weak passwords like "password1" accepted | XS | apps/web/src/modules/auth/auth.service.ts:113 |
| G-010 | `noImplicitAny: false` despite `strict: true` in tsconfig | [HIGH] | TypeScript safety partially disabled; silent type bugs | S | tsconfig.json |
| G-011 | Debug endpoints exposed: `/api/debug/parent-check`, `/api/debug/redis-keys` | [HIGH] | Internal data/Redis keys visible in production | XS | apps/web/src/app/api/debug/ |

---

## PHASE 2: Parent & Payment Flows (Most Broken User Journeys)

| # | Gap | Severity | Impact | Effort | File:Line |
|---|-----|----------|--------|--------|-----------|
| G-012 | No payment gateway (Razorpay / Stripe / PayU) anywhere in codebase | [CRITICAL] | Schools cannot collect fees digitally; entire fees module is record-only | L | No dep in package.json, no webhook handlers |
| G-013 | All admission notifications stubbed — parents never notified of any status change | [CRITICAL] | Parents in the dark through entire enrollment journey | M | apps/web/src/modules/admission/admission.service.ts:56,104,143 |
| G-014 | Parent absence notification not implemented | [CRITICAL] | Core parent value prop (know when child is absent) is entirely missing | M | No attendance notification service exists |
| G-015 | Gate pass OTP never sent — returns fake success `"Parent OTP sent via SMS."` | [HIGH] | Staff think parent consented; parent gets nothing | S | apps/web/src/app/api/attendance/gate-pass/route.ts:81-85 |
| G-016 | Fee overdue not automated — no cron marks invoices overdue after due date | [HIGH] | Late fee config exists but never applied; overdue tracking is manual | M | apps/web/src/app/api/fees/late-fee-config/route.ts |
| G-017 | No refund flow | [HIGH] | Blocks schools that need to reverse payments | M | No refund endpoint anywhere |
| G-018 | Fee notification endpoint is a stub — "In production…" comment, no delivery | [HIGH] | Bulk fee reminder sends nothing | S | apps/web/src/app/api/fees/notify/route.ts:31 |
| G-019 | Admission fee invoice created, no online collection path | [CRITICAL] | Admission funnel ends at "pay manually"; no digital payment | L | apps/web/src/modules/admission/admission.provisioner.ts:121-137 |
| G-020 | Section assignment blocks approval with no UI warning (silent blocker) | [MEDIUM] | Admin clicks Approve → error with no explanation | S | apps/web/src/modules/admission/admission.service.ts:119-123 |
| G-021 | Partial payment shows status badge but no "Pay Remaining" button | [MEDIUM] | Parent cannot complete partial payments from UI | S | apps/web/src/app/dashboard/fees/page.tsx |

---

## PHASE 2: Notifications (Entire Layer Is Broken)

| # | Gap | Severity | Impact | Effort | File:Line |
|---|-----|----------|--------|--------|-----------|
| G-022 | Push notifications fully stubbed (no Firebase FCM / APNs) | [HIGH] | Every push notification silently dropped | M | apps/web/src/services/notification.service.ts:21 |
| G-023 | SMS notifications beyond OTP not implemented | [HIGH] | No absence alerts, fee reminders, or exam results via SMS | M | notification.service.ts — 'sms' channel defined, not wired |
| G-024 | Notification history capped at 8 items, no archive table | [MEDIUM] | Users lose notification history; no inbox | S | apps/web/src/services/notification.service.ts:212 |
| G-025 | No notification preferences / opt-in / opt-out | [MEDIUM] | Compliance issue; users cannot control their alerts | M | Mobile profile screen: "Coming Soon" |

---

## PHASE 3: Half-Built Modules

| # | Gap | Severity | Impact | Effort | File:Line |
|---|-----|----------|--------|--------|-----------|
| G-026 | Courses (LMS): no video hosting, no player, no CDN | [CRITICAL] | Entire LMS is a data model; no content can be delivered | L | courses module — content_url field only |
| G-027 | Courses: no quiz engine (type 'quiz' exists, no questions/scoring) | [HIGH] | Quiz lessons are empty shells | L | apps/web/src/app/api/courses/[id]/modules/[moduleId]/lessons/route.ts:75 |
| G-028 | Courses: no certificate generation (certificateNo stored, no PDF) | [HIGH] | Completion certificates promised but not generated | M | courses progress/route.ts:62 |
| G-029 | Courses: paid enrollment stays 'pending' forever (no payment webhook) | [CRITICAL] | Paid courses never unlock for students | M | apps/web/src/app/api/courses/[id]/enroll/route.ts |
| G-030 | Homework: students cannot submit answers (no student submission endpoint) | [CRITICAL] | Daily core student workflow is entirely missing | M | No student submission route exists |
| G-031 | Homework: no grading / marks entry workflow | [HIGH] | Teachers assign; cannot grade | M | No grading endpoint |
| G-032 | Homework: file attachments stored as base64 in PostgreSQL | [CRITICAL] | DB will bloat by GBs within weeks of first real school; queries become slow | M | apps/web/src/app/dashboard/homework/page.tsx:142-161 |
| G-033 | Timetable: no conflict detection — can double-book a teacher | [HIGH] | Two classes assigned same teacher same slot silently | M | apps/web/src/app/api/timetable/generate/route.ts:72-77 |
| G-034 | Timetable: periods hardcoded to 8, not configurable per school | [MEDIUM] | Schools with different period structures cannot configure | S | timetable route lines 17-26 |
| G-035 | Exam results / report cards: no distribution to parents | [HIGH] | Report cards generated in DB, parents can never view or receive them | M | apps/web/src/app/api/report-cards/generate/route.ts |
| G-036 | HRMS: payslip is just a URL field — no PDF generation | [HIGH] | Payroll is calculated but payslips don't exist | M | StaffPayroll.payslipUrl in schema |
| G-037 | HRMS: TDS is a fixed monthly amount, no income tax slab computation | [HIGH] | Incorrect salary deductions; compliance risk | L | apps/web/src/app/api/hrms/payroll/route.ts:120 |
| G-038 | Transport: GPS fields exist but no real-time tracking service integrated | [MEDIUM] | Live bus tracking promised; only stores last-known coords | L | rides/route.ts — gpsLat/gpsLng columns only |
| G-039 | Performance: "AI" features are if/else templates, not ML | [MEDIUM] | Marketing risk if sold as AI-powered | S | apps/web/src/app/api/performance/route.ts:589-604 |
| G-040 | Subject-wise attendance: DB field exists, no UI to mark or view | [MEDIUM] | Feature scaffolded but inaccessible | M | attendance service — field accepted, not surfaced |
| G-041 | Library: fine has no payment status or integration with fees module | [MEDIUM] | Library fines tracked but never collected | M | apps/web/src/app/api/library/issues/route.ts |
| G-042 | Attendance regularization: no audit trail of who changed what | [MEDIUM] | Cannot verify if attendance correction was legitimate | S | apps/web/src/modules/attendance/attendance.service.ts:106-110 |

---

## PHASE 5 & 6: Data, Compliance & Scale

| # | Gap | Severity | Impact | Effort | File:Line |
|---|-----|----------|--------|--------|-----------|
| G-043 | Aadhaar number stored in plain text in DB | [CRITICAL] | DPDP Act 2023 violation risk; ₹250cr fine exposure | M | schema.prisma — Teacher:216, Student:272, Parent:341, AdmissionChild:1055 |
| G-044 | Hard deletes with CASCADE — deleting a student destroys all their records | [CRITICAL] | Irreversible data loss: attendance, fees, results, homework all gone | L | schema.prisma — onDelete: Cascade on all student relationships |
| G-045 | No AuditLog model — cannot answer "who changed what" | [CRITICAL] | Legal & compliance requirement for school records | M | schema.prisma — no AuditLog table |
| G-046 | Super-admin export without schoolId returns ALL schools' data | [CRITICAL] | One API call leaks every student, every fee, every attendance record | XS | apps/web/src/app/api/reports/export/route.ts:40 |
| G-047 | Phone numbers stored in plain text | [HIGH] | PII exposure if DB breached | M | schema.prisma — User:151, Parent:347 |
| G-048 | No GDPR / DPDP data erasure endpoint | [HIGH] | Cannot honor school offboarding or parent data deletion requests | L | No deletion/erasure routes anywhere |
| G-049 | Missing composite indexes: `(student_id, date)` on Attendance; `(school_id, student_id, status)` on FeeInvoice | [MEDIUM] | Full table scans on core queries at 1,000+ student scale | S | schema.prisma |
| G-050 | Only 1 cron job (dashboard precompute) — no automated business logic | [HIGH] | No overdue fee marking, no low-attendance alerts, no scheduled notifications | M | apps/web/src/app/api/cron/ |
| G-051 | No alerting if cron/precompute fails — dashboards silently go stale | [MEDIUM] | Ops blind spot; dashboards show stale data with no indication | S | apps/web/src/jobs/precompute.ts |
| G-052 | Mobile app: 25+ module screens are placeholder — parent portal is minimal | [HIGH] | Highest-volume user type has thinnest experience | XL | Mobile app audit |

---

## Fix Roadmap (Sequenced)

### Sprint 0 — Pre-Launch Security Blockers (2–3 weeks)
*Must complete before any school goes live. Zero negotiation.*

1. **G-046** — Fix export endpoint: require `schoolId` for super-admin or scope explicitly (30 min)
2. **G-001** — Create `middleware.ts`; move auth check out of individual routes (1 day)
3. **G-002 + G-003** — Add Redis-based rate limiting (5 req/min login, 3 req/10min OTP) + account lockout (1 day)
4. **G-011** — Remove or protect debug endpoints behind `NODE_ENV` check (30 min)
5. **G-032** — Move homework attachments to S3/cloud storage; store URLs not base64 (2 days)
6. **G-008** — Remove OTP from console logs in non-dev environments (30 min)

### Sprint 1 — Compliance (2–3 weeks)
*Required for DPDP Act. Blocks enterprise/institutional sales.*

7. **G-043 + G-047** — Encrypt Aadhaar and phone at rest (AES-256 application-layer encryption) (3 days)
8. **G-044** — Migrate critical models (Student, FeeInvoice, Attendance, ExamResult) to soft deletes with `deletedAt` (3 days)
9. **G-045** — Create `AuditLog` model; wire to student, fee, and attendance mutations (3 days)
10. **G-048** — Build school data export (portability) and erasure endpoints (2 days)

### Sprint 2 — Complete One Vertical Slice (3–4 weeks)
*Pick attendance OR fees. Make it work end-to-end. Ship that before expanding.*

**Attendance slice (highest daily-use):**
11. **G-014** — Wire parent absence SMS via Twilio (already integrated for OTP) (1 day)
12. **G-015** — Fix gate pass: actually send OTP via Twilio; remove fake success (1 day)
13. **G-022** — Integrate Firebase FCM for push; store device tokens in DB (3 days)

**OR Fees slice (revenue-generating):**
14. **G-012** — Integrate Razorpay: payment links, webhook handler, signature verification (5 days)
15. **G-016** — Add cron job: mark invoices overdue after due_date + apply late fee (1 day)
16. **G-018** — Wire fee reminder SMS/email via Twilio + Brevo (1 day)

### Sprint 3 — Student & Parent Journeys (3–4 weeks)

17. **G-013** — Wire Twilio SMS + Brevo email for admission notifications (replace all console.log stubs) (2 days)
18. **G-030** — Add student homework submission endpoint (file upload → S3) (2 days)
19. **G-031** — Add teacher grading workflow for homework (1 day)
20. **G-035** — Add parent-facing report card view endpoint + SMS notification on publish (2 days)
21. **G-004 + G-005** — Add `/api/auth/logout` with Redis token blacklist; reduce JWT to 1h + refresh token (2 days)

### Sprint 4 — Module Depth & Scale (4–6 weeks)

22. **G-033** — Timetable conflict detection (teacher availability matrix check before slot assignment) (3 days)
23. **G-036** — HRMS payslip PDF generation using existing pdf.service.ts (2 days)
24. **G-037** — Income tax slab calculator (basic slab engine for India FY) (5 days)
25. **G-049** — Add missing DB indexes (1 day)
26. **G-026 + G-029** — Courses: integrate S3 for video, Razorpay webhook for paid enrollment (5 days)
27. **G-050** — Add 3 cron jobs: overdue fees, low-attendance alerts, payroll reminders (2 days)

### Backlog — Roadmap Items

- G-027 Quiz engine (LMS)
- G-028 Certificate PDF generation
- G-038 Real-time GPS (Traccar or Google Maps Platform)
- G-039 Replace template-based "AI" with actual ML or LLM inference
- G-034 Configurable timetable periods
- G-025 Notification preferences / opt-in
- G-041 Library fine → fees module integration
- G-052 Mobile parent portal — full feature parity

---

## Effort Key
- XS = < 2 hours | S = 1–2 days | M = 3–5 days | L = 1–2 weeks | XL = 3+ weeks
