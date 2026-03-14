# Yulaa – Student Management System

A multi-tenant SaaS web application for school management built with **Next.js 14**, **PostgreSQL**, and **Tailwind CSS**. Designed for schools across India with role-based access for Admins, Teachers, Parents, and Students.

---

## Features

### Core Modules
- **Dashboard** – Real-time stats (students, attendance, fees, teachers), recent announcements, and homework overview
- **Student Management** – Full CRUD, admission workflow (pending → approved/rejected), search, filter by class/status, pagination
- **Attendance** – Class-wise daily marking (teacher), toggle-based UI (present/absent/late), "Mark All Present", per-class overview cards
- **Fee Management** – Invoice tracking, payment status (paid/unpaid/overdue/partial), summary cards with collection rate
- **Homework** – Assign homework per class/subject, track submissions count, due date tracking, overdue indicators
- **Announcements** – School-wide communications with type categorization (general/urgent/event/holiday/exam/fee_reminder) and audience targeting
- **Leave Management** – Apply for leave, admin approval/rejection workflow, leave type categorization
- **Queries & Support** – Raise queries to administration, priority levels, reply tracking
- **Teachers** – Staff directory with subjects, qualifications, contact info
- **Settings** – Profile view, role information, school settings

### Architecture
- **Multi-tenant** – `school_id` on every table, supports multiple schools per platform
- **Role-based access (RBAC)** – Super Admin, School Admin, Teacher, Parent, Student, Vendor, Consultant
- **Multi-child, multi-school parents** – Parents can link children across different schools via `parent_students` junction table
- **JWT authentication** – Stateless auth with role resolution per school

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14 (App Router), React 18   |
| Styling     | Tailwind CSS, custom design system   |
| Backend     | Next.js API Routes                   |
| Database    | PostgreSQL with UUID primary keys    |
| Auth        | JWT (jsonwebtoken) + bcryptjs        |
| Fonts       | DM Sans (display), Source Sans 3 (body) |

---

## Getting Started

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 14+ (running locally or remote)

### 1. Clone & Install

```bash
cd student-management-app
npm install
```

### 2. Set Up Database

Create a PostgreSQL database:

```bash
createdb yulaa_dev
```

Update `.env.local` if your database credentials differ:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yulaa_dev
JWT_SECRET=your-random-secret-here
```

### 3. Run Database Setup & Seed

```bash
# Create all tables
npm run db:setup

# Insert demo data (schools, users, students, attendance, fees, etc.)
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

All demo accounts use password: **`password123`**

| Role         | Email                          | School                          |
|--------------|-------------------------------|---------------------------------|
| Super Admin  | superadmin@yulaa.ai           | Platform-wide                   |
| School Admin | admin@dps45.edu.in            | Delhi Public School - Sector 45 |
| Teacher      | priya.teacher@dps45.edu.in    | Delhi Public School - Sector 45 |
| Parent       | parent.singh@gmail.com        | Delhi Public School - Sector 45 |

The login page has quick-access demo buttons for each role.

---

## Database Schema

### Core Tables (11 modules, 20+ tables)

**Tenancy & Identity:** `schools`, `users`, `roles`, `user_roles`

**People & Academic:** `classes`, `students`, `teachers`, `parents`, `parent_students`

**Operations:** `attendance`, `fee_invoices`, `fee_payments`, `fee_structures`, `homework`, `homework_submissions`, `announcements`, `leave_requests`, `queries`, `query_replies`, `transport_routes`, `transport_subscriptions`, `exams`, `exam_results`

**System:** `audit_log`

### Key Design Decisions
- UUID primary keys everywhere for distributed-friendly IDs
- `school_id` as tenant key on all operational tables
- `parent_students` many-to-many for multi-child/multi-school parent support
- `user_roles` allows same user to have different roles at different schools
- Unique constraints: `(school_id, admission_no)` for students, `(student_id, date)` for attendance

---

## API Routes

| Method | Endpoint            | Description                       |
|--------|---------------------|-----------------------------------|
| POST   | /api/auth/login     | Authenticate user, return JWT     |
| GET    | /api/dashboard      | Dashboard stats & recent activity |
| GET    | /api/students       | List students (search, filter, paginate) |
| POST   | /api/students       | Create new student                |
| PATCH  | /api/students       | Update admission status           |
| GET    | /api/attendance     | Attendance overview or class detail |
| POST   | /api/attendance     | Mark attendance for a class       |
| GET    | /api/fees           | List invoices with summary        |
| POST   | /api/fees           | Create fee invoice                |
| GET    | /api/homework       | List homework assignments         |
| POST   | /api/homework       | Assign new homework               |
| GET    | /api/announcements  | List announcements                |
| POST   | /api/announcements  | Create announcement               |
| GET    | /api/teachers       | List teachers                     |
| GET    | /api/classes        | List classes with student counts  |
| GET    | /api/leave          | List leave requests               |
| POST   | /api/leave          | Apply for leave                   |
| PATCH  | /api/leave          | Approve/reject leave              |
| GET    | /api/queries        | List support queries              |
| POST   | /api/queries        | Raise new query                   |

All endpoints (except login) require `Authorization: Bearer <token>` header.

---

## Project Structure

```
student-management-app/
├── scripts/
│   ├── setup-db.js          # Database schema creation
│   └── seed-db.js           # Demo data seeding
├── src/
│   ├── app/
│   │   ├── api/             # 10 API route modules
│   │   │   ├── auth/login/
│   │   │   ├── dashboard/
│   │   │   ├── students/
│   │   │   ├── attendance/
│   │   │   ├── fees/
│   │   │   ├── homework/
│   │   │   ├── announcements/
│   │   │   ├── teachers/
│   │   │   ├── classes/
│   │   │   ├── leave/
│   │   │   └── queries/
│   │   ├── login/           # Login page
│   │   ├── dashboard/       # Dashboard + all sub-pages
│   │   │   ├── students/
│   │   │   ├── attendance/
│   │   │   ├── fees/
│   │   │   ├── homework/
│   │   │   ├── announcements/
│   │   │   ├── teachers/
│   │   │   ├── leave/
│   │   │   ├── queries/
│   │   │   └── settings/
│   │   ├── layout.js        # Root layout
│   │   ├── page.js          # Root redirect
│   │   └── globals.css      # Tailwind + custom styles
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.js   # Role-based navigation sidebar
│   │       └── Header.js    # Top bar with logout
│   └── lib/
│       ├── db.js            # PostgreSQL pool
│       └── auth.js          # JWT utilities
├── .env.local
├── tailwind.config.js
├── next.config.js
└── package.json
```

---

## Future Roadmap (as per Yulaa spec)

- [ ] Transport module with GPS tracking & ETA
- [ ] Accessories/e-commerce store with Razorpay integration
- [ ] Exam results & performance reports
- [ ] Bulk CSV student onboarding with validation
- [ ] Multi-channel notifications (Push, SMS, WhatsApp)
- [ ] Super Admin tenant management & billing
- [ ] Parent PWA with offline sync
- [ ] Analytics dashboard with charts
- [ ] File attachments for homework submissions
- [ ] Calendar integration with holidays & events

---

## License

Private – Yulaa Student Management System
