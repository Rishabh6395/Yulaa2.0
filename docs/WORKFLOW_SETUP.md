# Yulaa 2.0 — Workflow Configuration & Setup Guide

> **Version:** 2.0 | **Last updated:** 2026-06-01  
> **Audience:** School Admins, Principals, Super Admins

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start — Seed All Default Workflows](#2-quick-start)
3. [Admission Workflow](#3-admission-workflow)
4. [Leave Workflow](#4-leave-workflow)
5. [Attendance Regularization](#5-attendance-regularization)
6. [Generic Workflows (Fee Waiver & Queries)](#6-generic-workflows)
7. [Role Permission Matrix](#7-role-permission-matrix)
8. [API Reference](#8-api-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Overview

Yulaa 2.0 ships with **5 workflow types**. Each controls how a request moves through approval stages before being finalized.

| Workflow | Who Initiates | Who Approves | Configured Via |
|---|---|---|---|
| **Admission** | Parent / Applicant | Admin → Principal | `/dashboard/admissions/workflow` |
| **Leave** | Teacher / Employee / Parent | Principal / Admin (per role) | `/dashboard/schools/[id]/leave` → Approval tab |
| **Attendance Regularization** | Teacher | Principal | Generic workflow (auto-seeded) |
| **Fee Waiver** | Parent | School Admin | Generic workflow (auto-seeded) |
| **Parent Query** | Parent | Teacher | Generic workflow (auto-seeded) |

**None of these workflows work until they are configured.** A blank workflow means users will see empty screens or receive errors when trying to submit requests.

---

## 2. Quick Start

### One-call seed (recommended for new schools)

Run once per school to create all default workflow configurations:

```bash
curl -X POST https://your-domain.com/api/admin/seed-workflows \
  -H "Authorization: Bearer <SCHOOL_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Super admins can target any school:

```bash
curl -X POST https://your-domain.com/api/admin/seed-workflows \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "schoolId": "clx..." }'
```

**Expected response:**

```json
{
  "ok": true,
  "schoolId": "clx...",
  "seeded": {
    "admissionWorkflow": "created",
    "leaveWorkflows": {
      "teacher":   "created",
      "employee":  "created",
      "hod":       "created",
      "principal": "created"
    },
    "genericWorkflows": {
      "attendance":    "created",
      "fee":           "created",
      "query_parents": "created"
    }
  },
  "summary": "8 workflow(s) created, rest already existed."
}
```

Running the call again is **safe** — already-seeded workflows return `"skipped"`.

### Default configurations created

| Workflow | Steps | Notes |
|---|---|---|
| Admission | 2 steps | Step 1: Admin Review + doc checklist. Step 2: Principal Approval + class assignment |
| Leave (teacher) | 1 step | Teacher → Principal |
| Leave (employee) | 1 step | Employee → School Admin |
| Leave (hod) | 1 step | HoD → Principal |
| Leave (principal) | 1 step | Principal → School Admin |
| Attendance Regularization | 1 step | Teacher → Principal |
| Fee Waiver | 1 step | Parent → School Admin |
| Parent Query | 1 step | Parent → Teacher |

---

## 3. Admission Workflow

### What it controls
The admission application pipeline. Each stage can have:
- A checklist of items (document verification, remarks, class/section assignment, payment)
- A payment gate (Razorpay, PayU, Stripe, offline)
- A SPOC (Single Point of Contact) for visibility
- Reassignment capability (hand off to another user)

### Configure via UI

1. Log in as **School Admin** or **Super Admin**
2. Navigate to **Admissions → Workflow** (`/dashboard/admissions/workflow`)
3. Choose a preset or build stages manually:

| Preset | Stages | Best for |
|---|---|---|
| Direct (1-step) | Admin approves directly | Small schools |
| Standard (2-step) | Admin review → Principal approval | Most schools ✓ |
| Full (3-step) | Teacher screening → Admin review → Principal approval | Large schools |

4. For each stage, configure:
   - **Stage name** — label shown in the UI
   - **Initiator role** — who can send to this stage
   - **Approver role** — who acts at this stage
   - **Checklist items** — add doc checks, remarks fields, class assignment
   - **Payment gate** — enable if fees are collected at this step
   - **Is Final** — check for the last stage (auto-provisions student record + fee invoice on approval)
   - **Email notifications** — notify applicant on stage transition
   - **Allow reassign** — let the approver hand off to another staff member

5. Click **Save Workflow**

### Configure via API

```bash
POST /api/admission/workflow
Authorization: Bearer <SCHOOL_ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "Standard Admission",
  "sameForAllRoles": true,
  "stages": [
    {
      "stageName": "Admin Review",
      "initiatorRole": "parent",
      "approverRole": "school_admin",
      "isFinal": false,
      "emailEnabled": true,
      "checklistItems": [
        { "label": "Verify Documents", "type": "yes_no", "actionRole": "school_admin" },
        { "label": "Remarks",          "type": "remarks", "actionRole": "school_admin" }
      ]
    },
    {
      "stageName": "Principal Approval",
      "initiatorRole": "school_admin",
      "approverRole": "principal",
      "isFinal": true,
      "emailEnabled": true,
      "checklistItems": [
        { "label": "Assign Class & Section", "type": "class_section", "actionRole": "principal" }
      ]
    }
  ]
}
```

### Checklist item types

| type | Description |
|---|---|
| `yes_no` | Simple yes/no checkbox |
| `remarks` | Free-text remarks field |
| `payment` | Triggers payment collection at this step |
| `class_section` | Dropdown to assign class and section |
| `document` | Document upload requirement |

### Application lifecycle

```
Draft → Submitted → [Step 1 pending] → [Step 1 approved] → [Step 2 pending] → Approved → Student provisioned
                                     ↘ Rejected
```

---

## 4. Leave Workflow

### What it controls
Leave request approval per employee role. Each role (teacher, employee, hod, principal) has its own independent approval chain.

### Configure via UI

1. Log in as **Super Admin**
2. Navigate to **Schools → [School] → Leave** (`/dashboard/schools/[id]/leave`)
3. Go to the **Approval Workflows** tab
4. Select a role from the dropdown (teacher / employee / hod / principal)
5. Add stages (each stage has: initiator, approver, specific user override, SPOC, notifications)
6. Save

### Configure Leave Types (required before workflow works)

1. In the same `/dashboard/schools/[id]/leave` page, go to the **Leave Type Master** tab
2. Add leave types:

| Code | Name | Applicable Roles |
|---|---|---|
| CL | Casual Leave | teacher, employee, hod |
| SL | Sick Leave | all roles |
| EL | Earned Leave | all roles |
| ML | Maternity Leave | all roles |
| PL | Paternity Leave | all roles |

3. Go to the **Balance Policy** tab and set annual allocation per role per leave type
4. Go to the **Holiday Calendar** tab and import holidays (CSV/Excel) or add manually

### Configure via API

```bash
POST /api/super-admin/schools/{schoolId}/workflow
Authorization: Bearer <SUPER_ADMIN_TOKEN>
Content-Type: application/json

{
  "type": "leave",
  "role": "teacher",
  "stages": [
    {
      "stageName": "Principal Approval",
      "initiatorRole": "teacher",
      "approverRole": "principal",
      "emailEnabled": true,
      "notifyEnabled": true,
      "notifyMessage": "Your leave request has been reviewed."
    }
  ]
}
```

### Leave request lifecycle

```
Teacher submits → [Pending at Step 1] → Principal approves → Approved
                                      ↘ Rejected
                 ← Teacher withdraws (if still pending)
```

---

## 5. Attendance Regularization

### What it controls
Allows teachers to request a correction to a student's attendance status (e.g. change `absent` → `present` with a reason). Requires principal/admin approval.

### Configuration
No separate UI configuration needed. The generic `attendance` workflow (created by the seed endpoint) drives this flow.

To view or modify: **Schools → [School] → Workflow** (`/dashboard/schools/[id]/workflow`), select **Attendance** type.

### Submit a regularization request (teacher)

```bash
POST /api/attendance/regularization
Authorization: Bearer <TEACHER_TOKEN>

{
  "attendanceId": "att_xxx",
  "studentId":    "stu_xxx",
  "toStatus":     "present",
  "reason":       "Student attended but was incorrectly marked absent"
}
```

### Approve a regularization request (principal/admin)

```bash
PATCH /api/attendance/regularization?id={regularizationId}
Authorization: Bearer <PRINCIPAL_TOKEN>

{
  "action": "approve",
  "comment": "Verified with register"
}
```

### Request lifecycle

```
Teacher submits → Pending → Principal approves → Attendance status updated
                          ↘ Rejected
```

---

## 6. Generic Workflows

### Fee Waiver

Allows parents to apply for a fee concession. School admin reviews and approves/rejects.

**Configure:** `/dashboard/schools/[id]/workflow` → select **Fee** type

**Submit (parent):**
```bash
POST /api/fees/concession
Authorization: Bearer <PARENT_TOKEN>

{
  "studentId":  "stu_xxx",
  "amount":      5000,
  "reason":      "Financial hardship",
  "documentUrl": "https://..."
}
```

**Approve (admin):**
```bash
PATCH /api/fees/concession?id={concessionId}
Authorization: Bearer <ADMIN_TOKEN>

{
  "action":  "approve",
  "comment": "Approved 50% concession"
}
```

### Parent Query

Allows parents to raise queries directed at teachers. Teacher responds, query is closed.

**Configure:** `/dashboard/schools/[id]/workflow` → select **Query (Parents)** type

---

## 7. Role Permission Matrix

### Who can submit each workflow

| Workflow | student | parent | teacher | hod | employee | school_admin | principal | super_admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Admission application | — | ✓ | — | — | — | ✓ | ✓ | ✓ |
| Leave request (own) | — | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Attendance regularization | — | — | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Fee waiver | — | ✓ | — | — | — | ✓ | ✓ | ✓ |
| Parent query | — | ✓ | — | — | — | — | — | — |

*parent for student leave only

### Who can approve each workflow

| Workflow | teacher | hod | school_admin | principal | super_admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Admission step 1 | — | — | ✓ | ✓ | ✓ |
| Admission step 2 (final) | — | — | ✓ | ✓ | ✓ |
| Leave (teacher) | — | — | — | ✓ | ✓ |
| Leave (employee) | — | — | ✓ | ✓ | ✓ |
| Leave (hod/principal) | — | — | ✓ | ✓ | ✓ |
| Attendance regularization | — | — | ✓ | ✓ | ✓ |
| Fee waiver | — | — | ✓ | ✓ | ✓ |
| Parent query | ✓ | ✓ | ✓ | ✓ | ✓ |

### Who can configure workflows

| Configuration task | school_admin | principal | super_admin |
|---|:---:|:---:|:---:|
| Seed default workflows | ✓ | ✓ | ✓ |
| Edit admission workflow | ✓ | ✓ | ✓ |
| Edit leave workflow | — | — | ✓ |
| Edit generic workflows | — | — | ✓ |
| Create leave types | — | — | ✓ |
| Set balance policies | — | — | ✓ |
| Manage holiday calendar | — | — | ✓ |

---

## 8. API Reference

### Workflow Seed

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/seed-workflows` | admin/principal/super | Seed all default workflows for a school |

### Admission

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admission/workflow` | admin | Get current workflow config |
| POST | `/api/admission/workflow` | admin | Save workflow config |
| GET | `/api/admission/applications` | admin/teacher | List applications |
| POST | `/api/admission/applications` | parent/admin | Submit application |
| GET | `/api/admission/applications/{id}` | admin/parent | Get application detail |
| PATCH | `/api/admission/applications/{id}` | admin | Update status |
| POST | `/api/admission/applications/{id}/action` | admin | Approve / reject at step |
| PATCH | `/api/admission/applications/{id}/checklist` | admin | Mark checklist items |
| PATCH | `/api/admission/applications/{id}/assign` | admin | Reassign task |

### Leave

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/leave` | all roles | List leave requests |
| POST | `/api/leave` | employee/parent | Submit leave request |
| PATCH | `/api/leave` | reviewer roles | Approve / reject / withdraw |
| DELETE | `/api/leave` | admin | Delete leave record |
| GET | `/api/leave/balance` | all roles | Get leave balance |
| GET | `/api/leave/types` | all roles | Get available leave types |
| POST | `/api/leave/effective-days` | all roles | Calculate working days between dates |

### Attendance Regularization

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attendance/regularization` | admin/principal | List regularization requests |
| POST | `/api/attendance/regularization` | teacher/admin | Submit request |
| PATCH | `/api/attendance/regularization?id={id}` | principal/admin | Approve / reject |

### Generic Workflow Configuration (Super Admin)

| Method | Endpoint | Auth | Query Params | Description |
|---|---|---|---|---|
| GET | `/api/super-admin/schools/{id}/workflow` | super_admin | `?type=attendance\|fee\|query_parents\|leave\|admission` | Get workflow config |
| POST | `/api/super-admin/schools/{id}/workflow` | super_admin | — | Create / replace workflow |

### Sample Payloads

#### Submit leave request
```json
POST /api/leave
{
  "leaveTypeCode": "CL",
  "startDate":     "2026-06-10",
  "endDate":       "2026-06-11",
  "reason":        "Personal work"
}
```

#### Approve leave
```json
PATCH /api/leave
{
  "action":  "approve",
  "leaveId": "lv_xxx",
  "comment": "Approved"
}
```

#### Submit admission application
```json
POST /api/admission/applications
{
  "schoolId":       "sch_xxx",
  "studentName":    "Riya Sharma",
  "dateOfBirth":    "2015-04-12",
  "gender":         "female",
  "grade":          "5",
  "parentName":     "Priya Sharma",
  "parentPhone":    "9876543210",
  "parentEmail":    "priya@example.com",
  "address":        "123 MG Road, Bengaluru"
}
```

#### Approve admission step
```json
POST /api/admission/applications/{id}/action
{
  "action":  "approve",
  "comment": "Documents verified"
}
```

---

## 9. Troubleshooting

### Admission workflow — blank screen on `/dashboard/admissions/workflow`
**Cause:** No workflow configured yet.  
**Fix:** Run the seed endpoint (`POST /api/admin/seed-workflows`) or create a workflow via the UI.

### Admission application stuck — never advances to next step
**Cause:** No step has `isFinal: true`, so there is no terminal step.  
**Fix:** In the workflow builder, ensure the last step has **Is Final** checked. On approval, this step provisions the student record and sends the welcome email.

### Leave request shows 404 or "No leave types found"
**Cause:** Leave types have not been configured for the school.  
**Fix:** Navigate to `/dashboard/schools/[id]/leave` → **Leave Type Master** tab → add CL, SL, EL.

### Leave balance shows 0 even after leave types are added
**Cause:** Balance policy has not been configured.  
**Fix:** `/dashboard/schools/[id]/leave` → **Balance Policy** tab → set `daysPerYear` for each role × leave type combination.

### Attendance regularization returns 409 "Duplicate pending request"
**Cause:** A pending regularization for the same attendance record already exists.  
**Fix:** Approve or reject the existing request before creating a new one for the same attendance ID.

### Generic workflow (fee/query) has no effect
**Cause:** `GenericWorkflow` exists but no `GenericWorkflowStage` rows — workflow was created empty.  
**Fix:** Re-run the seed endpoint (it will skip admission/leave but recreate generic workflows if they have no stages). Or re-configure via `/dashboard/schools/[id]/workflow`.

### Super admin sees "Access denied" on `/dashboard/schools/[id]/workflow`
**Cause:** The page is restricted to `super_admin` role only.  
**Fix:** Confirm the logged-in user has `role_code = 'super_admin'` in `UserRole`. School admins configure admission workflow via `/dashboard/admissions/workflow`, not this page.

### Email notifications not sending
**Cause:** `emailEnabled: true` in workflow stage but no SMTP/email service configured.  
**Fix:** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` environment variables. Notifications are best-effort and do not block workflow progression.

---

*For API authentication details, see [AUTH_SETUP.md](./AUTH_SETUP.md). For database schema, see [apps/web/prisma/schema.prisma](../apps/web/prisma/schema.prisma).*
