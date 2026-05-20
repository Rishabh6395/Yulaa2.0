# Yulaa 2.0 — Complete Product Guide

> **Who this is for:** Everyone who uses Yulaa — school staff, parents, students, and platform administrators.
> **Language:** Plain English. No technical terms. No code.

> **Screenshot guide:** All `![…](docs/screenshots/…)` references are placeholders.
> Replace each file with a real screenshot taken from the running app.
> Screenshots folder: `docs/screenshots/`

---

## Table of Contents

1. [What Is Yulaa?](#1-what-is-yulaa)
2. [Who Uses Yulaa? (Roles)](#2-who-uses-yulaa-roles)
3. [How to Log In](#3-how-to-log-in)
4. [The Dashboard — Your Home Screen](#4-the-dashboard--your-home-screen)
5. [Admissions](#5-admissions)
6. [Students](#6-students)
7. [Teachers](#7-teachers)
8. [Parents](#8-parents)
9. [Attendance](#9-attendance)
10. [Fees & Payments](#10-fees--payments)
11. [Exams & Results](#11-exams--results)
12. [Report Cards & Performance](#12-report-cards--performance)
13. [Homework & Assignments](#13-homework--assignments)
14. [Timetable](#14-timetable)
15. [Syllabus Tracking](#15-syllabus-tracking)
16. [Leave Management](#16-leave-management)
17. [Announcements](#17-announcements)
18. [Online Classes](#18-online-classes)
19. [Recorded Courses](#19-recorded-courses)
20. [Career Sessions (Consultants)](#20-career-sessions-consultants)
21. [Queries & Support Tickets](#21-queries--support-tickets)
22. [Notifications](#22-notifications)
23. [Transport](#23-transport)
24. [Hostel](#24-hostel)
25. [Library](#25-library)
26. [School Inventory & Vendors](#26-school-inventory--vendors)
27. [Events](#27-events)
28. [Compliance Tracking](#28-compliance-tracking)
29. [Yearbook](#29-yearbook)
30. [Transfer Certificates](#30-transfer-certificates)
31. [Configuration Guide — How Everything Is Set Up](#31-configuration-guide--how-everything-is-set-up)
32. [Super Admin — Managing the Platform](#32-super-admin--managing-the-platform)

---

## 1. What Is Yulaa?

Yulaa is a **complete school management platform**. It is a single software that runs an entire school — from the moment a parent applies for admission, all the way through a student's daily attendance, exams, fee payments, and report cards.

Instead of using separate spreadsheets, WhatsApp groups, and paper forms, Yulaa puts everything in one place that everyone — staff, parents, and students — can access from any device with internet.

**One platform. One login. Everything in one place.**

---

## 2. Who Uses Yulaa? (Roles)

Every person in Yulaa has a **role**. Your role decides what you can see and what you can do. Think of it like a key — different keys open different doors.

### Platform Level

| Role | Who They Are | What They Do |
|------|-------------|--------------|
| **Super Admin** | The company that runs Yulaa | Creates schools on the platform, manages all settings, controls everything |

### School Level — Management

| Role | Who They Are | What They Do |
|------|-------------|--------------|
| **School Admin** | The school's operations manager | Manages everything inside one school — users, fees, forms, configuration |
| **Principal** | Head of the school | Approves admissions and results, views reports, oversees academics |
| **HOD** | Head of Department | Manages teachers, approves syllabus, reviews results for their department |
| **Vice Principal** | Deputy head | Similar access to Principal for oversight |

### School Level — Staff

| Role | Who They Are | What They Do |
|------|-------------|--------------|
| **Teacher** | Class/subject teacher | Marks attendance, creates exams, enters results, assigns homework |
| **Class Teacher** | Teacher in charge of a specific class | Same as Teacher, plus extra responsibility for their assigned class |
| **Accountant** | Finance staff | Manages fee invoices, records payments, generates fee reports |
| **Employee** | Any other school staff | Can view their own profile, apply for leave |

### External Users

| Role | Who They Are | What They Do |
|------|-------------|--------------|
| **Parent** | Guardian of a student | Views child's attendance, fees, results, communicates with school |
| **Student** | Enrolled student | Views their own timetable, homework, results, attendance |
| **Consultant** | Career counsellor | Offers career guidance sessions via Yulaa |
| **Vendor** | Supplier | Lists products and services available to the school |

> **Important:** A person can only see data that belongs to their school. A teacher at School A cannot see anything from School B.

---

## 3. How to Log In

### For School Staff, Parents, and Students

![Login page showing email and password fields with the Yulaa logo](docs/screenshots/01-login-page.png)
*The login screen. Enter your email and password, then click Log In.*

1. Open the Yulaa website
2. Enter your **email address** and **password**
3. Click **Log In**

**First time logging in?**
Your school admin would have created your account. You will receive a temporary password. When you log in for the first time, Yulaa will ask you to set a new password of your choice.

![Set new password screen after first login](docs/screenshots/02-first-login-set-password.png)
*First login: Yulaa asks you to create a new password before continuing.*

**Forgot your password?**
Click "Forgot Password" on the login screen. Enter your email address. Yulaa will send a link to reset your password.

![Forgot password screen with email input field](docs/screenshots/03-forgot-password.png)
*Forgot Password screen. Enter your registered email to receive a reset link.*

### For Parents Applying for Admission

Parents do not need an account to start an admission application. They visit the school's public admission page (shared by the school) and fill in the form. An account is automatically created for them when their child's admission is approved.

---

## 4. The Dashboard — Your Home Screen

After logging in, you land on your **Dashboard**. This is your home screen. It shows you the most important information relevant to your role, at a glance.

### What School Admins and Principals See

![Admin dashboard showing student count, today's attendance summary, fee collection card, pending admissions count, and pending leave requests](docs/screenshots/04-dashboard-admin.png)
*Admin / Principal dashboard. Key school stats are visible at a glance.*

- **Total students** in the school today
- **Today's attendance** — how many students are present, absent, or late across the school
- **Fee summary** — total fees to be collected, how much has been collected, how much is overdue
- **Pending admissions** — applications waiting for review
- **Pending leave requests** — staff leave requests waiting for approval
- **Recent announcements** — latest news posted in the school

### What Teachers See

![Teacher dashboard showing today's classes, pending homework submissions, leave balance card, and recent announcements](docs/screenshots/05-dashboard-teacher.png)
*Teacher dashboard. Shows classes, pending homework checks, and leave balance.*

- **Their classes** for the day
- **Pending homework** they assigned that hasn't been submitted by students
- **Leave balance** — how many leave days they have remaining
- **Recent announcements**

### What Parents See

![Parent dashboard showing child's name and class, today's attendance status badge, fee due amount, and recent announcements](docs/screenshots/06-dashboard-parent.png)
*Parent dashboard. Attendance, fees, and announcements for their child.*

- **Their child's name, class, and roll number**
- **Today's attendance** — whether their child is present or absent today
- **This month's attendance %** — e.g., "Present 22 out of 25 working days"
- **Fees due** — any unpaid invoices
- **Recent announcements from the school**
- **Pending homework** their child hasn't submitted

### What Students See

![Student dashboard showing today's timetable, pending homework list, upcoming exam dates, and attendance percentage](docs/screenshots/07-dashboard-student.png)
*Student dashboard. Timetable, homework, and attendance in one view.*

- **Today's timetable** — which subjects they have today and at what time
- **Pending homework** due soon
- **Upcoming exams**
- **Last exam results**
- **Attendance %** for the current month

---

## 5. Admissions

The Admissions module handles everything from a parent showing interest in the school to their child's first day as an enrolled student.

### How a Parent Applies

![Public admission form showing parent details section and child details section with fields for name, DOB, gender, and class applying for](docs/screenshots/08-admission-public-form.png)
*The public admission form that parents fill in. No login required.*

1. The school shares a link to their **online admission form**
2. The parent opens the link — no login required
3. The parent fills in:
   - Their own details (name, phone, email)
   - Child's details (name, date of birth, gender, class applying for, photo, Aadhaar)
   - Any other details the school has configured (previous school, documents, etc.)
4. The parent submits the form
5. Yulaa sends a confirmation message on their phone or email

> A parent can apply for **multiple children** in one application.

### Admission Applications List (Admin View)

![Admissions list page showing a table of applications with columns for applicant name, phone, status badge, date submitted, and action buttons](docs/screenshots/09-admissions-list.png)
*Admin view: all admission applications in one list. Filter by status, search by name.*

### Single Application Detail

![Application detail page showing parent info, child info, risk score badge, validation warnings, and action buttons for Approve and Reject](docs/screenshots/10-admission-detail.png)
*Application detail page. Admin sees all details, risk score, and takes action here.*

### What Happens After Submission

The application goes into a **workflow** — a step-by-step review process that the school has configured. For example:

- **Step 1:** Application submitted → School staff review basic details
- **Step 2:** Interview / document check → Principal reviews
- **Step 3:** Final approval → School admin accepts or rejects

At each step, the reviewer can:
- Mark checklist items as done (e.g., "Birth certificate verified ✓")
- Add comments or notes
- Move the application to the next step, or reject it with a reason

### Automatic Risk Check

When an application is submitted, Yulaa automatically checks for problems such as:
- Duplicate phone number (same parent applying twice)
- Missing important documents
- Age that doesn't match the grade applied for
- Aadhaar number already used by another student

These are flagged as warnings for the reviewer. The reviewer can still approve despite a warning, but they are informed.

### What Happens When an Application Is Approved

When a school admin or principal approves the application:
1. A **student account** is automatically created for the child
2. A **parent account** is created (or linked to an existing one)
3. The child is assigned to the appropriate class
4. An **admission fee invoice** is automatically generated (if the school has configured an admission fee)
5. The parent receives login credentials by SMS/email

Everything happens automatically — the admin does not need to manually create student records.

### What Happens When an Application Is Rejected

- The parent is notified with the reason
- The application is closed
- No student or parent account is created

### Admission Waitlist

If seats are full for a class, the school can put applications on a **waitlist**. If a seat opens up, the school can move an application from the waitlist to active review.

---

## 6. Students

### Students List

![Students list page showing a table with student name, admission number, class, gender, status badge, parent name, and action buttons for Approve, Reject, and Add Parent](docs/screenshots/11-students-list.png)
*Students list. Search by name or admission number, filter by class or status.*

### Adding Students Manually

School admins can add students directly without going through the admission form. This is useful when migrating from another system.

**How to add a single student:**
Go to Students → Add Student → Fill in the form → Save

![Add Student modal/form showing fields grouped into sections: Basic Details, Academic, Identity, Medical, and Parent](docs/screenshots/12-student-add-form.png)
*Add Student form. Fields are grouped by category for easy navigation.*

**The student form includes:**
- **Basic details:** First name, middle name, last name, date of birth, gender
- **Admission details:** Admission number, roll number, SR number, class
- **Contact:** Address, parent name, parent phone, parent email
- **Identity:** Aadhaar number, passport number, photo
- **Medical:** Blood group, doctor's name, doctor's phone, insurance provider
- **Academic:** Stream (Science/Commerce/Arts), house, admission category (Regular/EWS/Sports quota)
- **Lifestyle:** Boarding type (Day Scholar/Boarder), diet type (Vegetarian/Non-vegetarian), disability type, transport route, bus stop
- **Background:** Religion, nationality, mother tongue, category (General/OBC/SC/ST)

> The school admin can **hide or make optional** any field that isn't relevant to their school. A day school doesn't need the boarding type field to be visible, for example. This is controlled in the Form Configuration settings.

### Bulk Import

To add many students at once:
1. Download the **Excel/CSV template** from the Students page
2. Fill in all student data in the template
3. Upload the file back to Yulaa
4. Yulaa creates all students and shows you a report of how many were created and any rows that had errors

![Bulk import result modal showing 3 stats: Total rows, Created successfully, Errors with a list of error details below](docs/screenshots/13-students-bulk-import-result.png)
*After a bulk import, Yulaa shows how many students were created and lists any rows with errors.*

---

## 7. Teachers

### Adding Teachers

![Teacher add form showing Personal, Professional, Certifications, and Banking sections](docs/screenshots/14-teacher-add-form.png)
*Teacher add form. Covers personal info, professional credentials, and banking details.*

**The teacher form includes:**
- **Personal:** Name, email, phone, date of birth, gender, photo
- **Professional:** Employee ID, designation (PRT/TGT/PGT), department, qualification, years of experience, joining date
- **Certifications:** Teaching certifications (B.Ed, CTET, IB Certificate, etc.)
- **Legal & Identity:** Aadhaar, PAN, category, employment type (Permanent/Contractual)
- **Banking:** Bank account, IFSC code, PF account number
- **International:** Work permit type, passport number (for international staff)

### Class Teacher Assignment

A teacher can be designated as the **Class Teacher** for a specific class. The class teacher has extra responsibility for that class (attendance, behaviour, parent communication).

---

## 8. Parents

### What Parents Can Do

![Parent portal showing child profile card, attendance calendar for current month, fee status with Pay Now button, and recent announcements](docs/screenshots/15-parent-portal-overview.png)
*Parent view after login. Child details, attendance, fees, and announcements all visible.*

After logging in, parents can:
- **View their child's profile** — class, roll number, photo
- **Check daily attendance** — see if their child is marked present, absent, or late on any day
- **View fee invoices** — see how much is due and pay online
- **See exam results** — view marks and grades once the teacher publishes them
- **Read announcements** — school-wide and class-specific announcements
- **View homework** — see what homework their child has been assigned
- **Check the timetable** — see their child's class schedule
- **Submit support queries** — ask the school questions

### Linking Multiple Children

If a parent has more than one child in the same school, both children appear under the same parent login. The parent can switch between children's dashboards.

![Parent dashboard showing a child switcher dropdown at the top with two children listed](docs/screenshots/16-parent-child-switcher.png)
*Parents with multiple children use the child switcher to toggle between dashboards.*

---

## 9. Attendance

### Marking Attendance (Teacher View)

![Attendance marking page showing a class roster with each student's name and radio buttons for Present, Absent, Late. A Submit button is at the bottom.](docs/screenshots/17-attendance-mark.png)
*Teacher marks attendance: select the class, pick a date, mark each student, then submit.*

### Attendance Status Options

| Status | Meaning |
|--------|---------|
| **Present** | Student came to school |
| **Absent** | Student did not come |
| **Late** | Student arrived after the bell |
| **Half Day** | Student came for part of the day |
| **Excused** | Absence was pre-approved (e.g., sports tournament) |

### Monthly Attendance Calendar (Parent / Student View)

![Monthly attendance calendar showing each day colour-coded: green for present, red for absent, yellow for late, grey for holiday/weekend](docs/screenshots/18-attendance-calendar.png)
*Parents and students see a colour-coded monthly calendar. Green = present, Red = absent.*

### Two Attendance Modes

**Class Attendance Mode (Default)**
One attendance record per student per day. The class teacher marks whether each student is present or absent for the whole day.

**Subject-wise Attendance Mode (Optional)**
Separate attendance is tracked for each subject period. More detailed but more work for teachers.

> The school admin configures which mode the school uses. This is set once and applies to all classes.

### Attendance Reports

![Attendance report page showing a table: student name, total days, days present, days absent, attendance % — with an Export button](docs/screenshots/19-attendance-report.png)
*Monthly attendance report. Export to Excel for records or sharing.*

If a student's attendance falls below a configured threshold (e.g., 75%), Yulaa can automatically alert the parent.

### Attendance Regularization

![Regularization request form showing student name, date, current status (Absent), reason textarea, and Submit button](docs/screenshots/20-attendance-regularization.png)
*A parent or student submits a regularization request explaining an absence. The teacher reviews and can change it to Excused.*

---

## 10. Fees & Payments

### Fee Structure Setup

![Fee structure page listing fee types in a table: Tuition Fee ₹8000/month, Bus Fee ₹1500/month, Lab Fee ₹5000/year — with Edit and Delete buttons per row and an Add Fee Type button](docs/screenshots/21-fee-structure.png)
*Fee structure page. Admin defines all fee types, amounts, and frequencies here.*

### Invoice List

![Fee invoices page showing a table: student name, invoice number, amount, due date, status badge (Paid/Unpaid/Overdue), and action buttons](docs/screenshots/22-fee-invoices-list.png)
*Invoices list. Filter by status to quickly see who has outstanding dues.*

### Recording a Payment

![Record payment modal showing invoice details at top, then fields: Amount Paid, Payment Method dropdown, Transaction Reference, and a Save button](docs/screenshots/23-fee-record-payment.png)
*Accountant records a payment. Method can be cash, cheque, online transfer, or concession.*

### Fee Concessions

![Fee concession form showing student name, concession amount, reason, and Approve/Reject buttons](docs/screenshots/24-fee-concession.png)
*Concession approval page. Once approved, the student's invoice amount reduces automatically.*

### Fee Reports

![Fee collection report showing summary cards: Total Billed, Total Collected, Outstanding, Overdue Count — then a table of students with their payment status](docs/screenshots/25-fee-report.png)
*Fee collection report for the principal or accountant. Export to Excel available.*

---

## 11. Exams & Results

### Exams List

![Exams list page showing exam cards with title, class, exam type badge, date, and status (Scheduled / Ongoing / Completed)](docs/screenshots/26-exams-list.png)
*Exams list. Each card shows the exam name, class, type, and current status.*

### Creating an Exam

![Create exam form with fields: Title, Exam Type dropdown, Class, Subject, Max Marks, Passing Marks, Start Date, End Date, Duration](docs/screenshots/27-exam-create-form.png)
*Create exam form. All fields are straightforward. Exam type comes from the master.*

### Entering Results

![Results entry grid: rows are students, columns are subjects. Each cell has a marks input. Grade is auto-filled. A Remarks column is at the end.](docs/screenshots/28-exam-results-entry.png)
*Results grid. Enter marks for each student; grade is calculated automatically.*

### Results Approval Workflow

![Results page showing status banner "Awaiting HOD Approval" with an Approve button and a comment box for the reviewer](docs/screenshots/29-exam-results-approval.png)
*HOD and Principal see this approval screen. They can approve or send back with comments.*

### What Parents See (Published Results)

![Student results view showing a card per subject: subject name, marks obtained / max marks, grade badge, and teacher's remark](docs/screenshots/30-exam-results-parent-view.png)
*Published results as seen by parents and students. Grade and remarks per subject.*

---

## 12. Report Cards & Performance

### Performance Dashboard

![Performance dashboard showing overall school average, attendance %, risk flag counts by level, and a list of at-risk students](docs/screenshots/31-performance-dashboard.png)
*Admin performance dashboard. Risk flags help identify students who need attention.*

### Report Card (Generated)

![Report card PDF preview showing school header, student photo and details, academic marks table, attendance %, skills radar chart, behaviour score, and teacher comments](docs/screenshots/32-report-card-preview.png)
*Generated report card preview. Click Download PDF to save or email to parents.*

### Risk Flagging

![Risk flags list showing student names with coloured risk badges: Low (green), Medium (yellow), High (orange), Critical (red) — and recommended action text](docs/screenshots/33-risk-flags.png)
*Risk flags list. Colour-coded severity. Admin can click any student to see their full profile.*

| Risk Level | Triggers |
|-----------|---------|
| **Low Risk** | Minor attendance dip |
| **Medium Risk** | Attendance below 80%, or declining marks |
| **High Risk** | Attendance below 75%, multiple behaviour incidents |
| **Critical Risk** | Attendance below 65%, failing grades, multiple issues |

---

## 13. Homework & Assignments

### Homework List (Teacher View)

![Homework list showing homework cards: title, subject, class, due date, and a submission count like "18 / 32 submitted"](docs/screenshots/34-homework-teacher-list.png)
*Teacher's homework list. Submission count shows progress without opening each item.*

### Creating Homework

![Add homework form showing Title, Subject, Class, Description textarea, Due Date picker, and Attach Files button](docs/screenshots/35-homework-create.png)
*Create homework form. Attach reference PDFs or images. Students are notified on save.*

### Submission Tracking

![Homework submissions page showing a table: student name, status badge (Submitted / Submitted Late / Not Submitted), submission time](docs/screenshots/36-homework-submissions.png)
*Submission tracker. Teacher sees each student's submission status at a glance.*

### What Students See

![Student homework page showing pending homework cards with title, subject, due date, and a Mark as Done button](docs/screenshots/37-homework-student-view.png)
*Student view. Pending homework is shown with due date. Overdue items are highlighted in red.*

---

## 14. Timetable

### Weekly Timetable View

![Weekly timetable grid: rows are time slots (8am, 9am, etc.), columns are days (Mon–Sat). Each cell shows subject and teacher name. Breaks are shaded grey.](docs/screenshots/38-timetable-week-view.png)
*Weekly timetable. Click any cell for detail. Breaks and free periods are clearly shaded.*

### Teacher's Personal Timetable

![Teacher timetable showing only the classes that teacher is assigned to, with class name, subject, and time — across Mon to Sat](docs/screenshots/39-timetable-teacher-view.png)
*Teacher's personal schedule. Only shows their assigned classes, not the full school timetable.*

---

## 15. Syllabus Tracking

### Syllabus Plan View

![Syllabus page showing a tree: Grade 9 → Mathematics → Chapter 1: Number Systems → Topic: Rational Numbers (Completed), Topic: Irrational Numbers (In Progress)](docs/screenshots/40-syllabus-plan.png)
*Syllabus plan. Topics are nested under chapters. Completion percentage shown per chapter.*

### Coverage Progress

![Syllabus coverage bar chart showing % completed per subject for Grade 9: English 80%, Math 65%, Science 45%, Social Studies 90%](docs/screenshots/41-syllabus-coverage.png)
*Coverage chart for HOD/admin. Quickly shows which subjects are falling behind schedule.*

---

## 16. Leave Management

### Leave Balance (Staff View)

![Leave balance card showing: Casual Leave 8/12 remaining, Sick Leave 6/6 remaining, Earned Leave 14/20 remaining](docs/screenshots/42-leave-balance.png)
*Leave balance widget on the staff dashboard. Shows days remaining per leave type.*

### Applying for Leave

![Apply for leave form showing: Leave Type dropdown, Start Date, End Date, Reason textarea, and Submit button. Effective days auto-calculated.](docs/screenshots/43-leave-apply-form.png)
*Leave application form. Yulaa auto-calculates working days (excluding weekends and holidays).*

### Leave Approval (HOD / Principal View)

![Leave approval page showing a list of pending leave requests: staff name, leave type, dates, reason, days count — with Approve and Reject buttons per row](docs/screenshots/44-leave-approval-list.png)
*Pending leave requests waiting for the HOD or Principal to approve or reject.*

### Leave History

![Leave history table showing past requests: dates, type, days taken, status badge (Approved/Rejected), approved by name](docs/screenshots/45-leave-history.png)
*Staff can see all their past leave requests and their outcomes.*

---

## 17. Announcements

### Announcements Feed

![Announcements page showing a list of announcement cards: title, priority badge (Urgent/High/Normal), target audience tag, date posted, and attached file icon](docs/screenshots/46-announcements-list.png)
*Announcements list. Priority badges (Urgent, High, Normal) help readers know what's important.*

### Creating an Announcement

![Create announcement form showing Title, Message (rich text editor), Audience (dropdown: All / Specific Class / Staff Only), Priority, Attach Files, and Publish / Schedule buttons](docs/screenshots/47-announcement-create.png)
*Create announcement. Choose the audience and priority, attach files, then publish.*

---

## 18. Online Classes

### Online Classes Schedule

![Online classes page showing upcoming class cards: title, subject, class, date/time, platform badge (Zoom/Meet/Teams), and Join / View Recording buttons](docs/screenshots/48-online-classes-list.png)
*Upcoming online classes. Each card shows the platform and a Join button when the class is live.*

### Scheduling an Online Class

![Schedule online class form showing Title, Subject, Class, Date, Time, Duration, Platform dropdown (Google Meet / Zoom / Teams), and Generate Link button](docs/screenshots/49-online-class-schedule.png)
*Schedule a class. Select the platform and Yulaa generates the meeting link automatically.*

### Online Class Attendance

![Online class attendance page showing a list of students with Present / Absent radio buttons and a Submit button](docs/screenshots/50-online-class-attendance.png)
*After the class, the teacher marks who attended.*

---

## 19. Recorded Courses

### Course Browse Page

![Courses browse page showing course cards with thumbnail image, course title, instructor name, lesson count, and an Enroll button](docs/screenshots/51-courses-browse.png)
*Students and parents browse available courses. Each card shows the instructor and lesson count.*

### Course Detail (Student View)

![Course detail page showing course description, a module list on the left (Chapter 1, Chapter 2...) and the selected lesson content (video player) on the right. Progress bar at top showing 40% complete.](docs/screenshots/52-course-detail-student.png)
*Inside a course. Module list on the left, lesson content on the right. Progress bar tracks completion.*

### Course Management (Teacher View)

![Course management page showing the course's module list with drag handles for reordering, Add Module and Add Lesson buttons, and Publish/Unpublish toggle](docs/screenshots/53-course-manage-teacher.png)
*Teacher manages their course. Modules and lessons can be reordered by drag-and-drop.*

---

## 20. Career Sessions (Consultants)

### Browse Consultants

![Consultant browse page showing consultant cards with photo, name, expertise tags (Career Counselling, IIT-JEE, Abroad Studies), rating stars, and Book Session button](docs/screenshots/54-career-consultants-browse.png)
*Students browse available consultants. Expertise tags and ratings help them choose.*

### Booking a Session

![Session booking page showing the consultant's availability calendar with available time slots highlighted. A Book This Slot button appears when a slot is selected.](docs/screenshots/55-career-session-book.png)
*Availability calendar for a consultant. Student selects a free slot and books it.*

---

## 21. Queries & Support Tickets

### Queries Inbox (Admin View)

![Queries page with split-screen layout: left panel is the query list with ticket numbers, subjects, status badges, and priority dots. Right panel shows the selected query's full conversation thread.](docs/screenshots/56-queries-admin-inbox.png)
*Admin query inbox. Left: query list. Right: the selected conversation thread.*

### Submitting a New Query

![New query form showing Category dropdown, Subject, Description textarea, Priority selector, Attach Files, and Submit button](docs/screenshots/57-queries-new-form.png)
*Any user can submit a query. Category and priority help the admin triage quickly.*

---

## 22. Notifications

### Notifications Panel

![Notification bell icon showing a red badge with count. Clicking it opens a dropdown listing recent notifications with icons, text, and timestamps. Unread notifications have a blue dot.](docs/screenshots/58-notifications-panel.png)
*Notification dropdown. Unread notifications are marked with a blue dot. Click to mark as read.*

| Event | Who Gets Notified |
|-------|-----------------|
| New announcement | All target users |
| New homework assigned | Students and parents |
| Exam results published | Students and parents |
| Fee invoice generated | Parent |
| Fee overdue | Parent |
| Leave approved/rejected | Staff member who applied |
| New query reply | Person who raised the query |
| Admission approved | Parent |
| Online class starting soon | Students in that class |
| Report card published | Parent |

---

## 23. Transport

### Routes & Buses

![Transport page showing a list of routes on the left: Route 1 - North, Route 2 - South. Clicking a route shows the stops in order on the right with student count per stop.](docs/screenshots/59-transport-routes.png)
*Transport routes with stops. Each stop shows the number of students assigned to it.*

---

## 24. Hostel

### Room Allocation

![Hostel allocation page showing a floor plan grid of room cards. Each room shows room number, type, capacity, and current occupancy count. Full rooms are shaded differently.](docs/screenshots/60-hostel-room-grid.png)
*Hostel room grid. Click any room to see which students are allocated and assign new ones.*

---

## 25. Library

### Book Catalogue

![Library catalogue showing a searchable table: book title, author, subject, available quantity, and Issue button per row](docs/screenshots/61-library-catalogue.png)
*Library catalogue. Search by title or author. Available count updates as books are issued.*

### Issue / Return Log

![Library issue log showing: student name, book title, issue date, due date, return date (blank if not returned), and overdue fine amount](docs/screenshots/62-library-issue-log.png)
*Issue log. Overdue books are highlighted. Fine is auto-calculated based on days overdue.*

---

## 26. School Inventory & Vendors

### Inventory List

![Inventory page showing items: Laptop (12 units), Projector (4 units), Lab Microscope (20 units) — with Location, Condition, and Issue button per item](docs/screenshots/63-inventory-list.png)
*School inventory. Track quantity, location, and condition of all assets.*

### Vendor Marketplace

![Vendor marketplace showing vendor cards with company name, product categories, rating stars, and View Products button](docs/screenshots/64-vendor-marketplace.png)
*Vendor marketplace. Schools browse approved vendors and place orders within Yulaa.*

---

## 27. Events

### Events Calendar

![Events page showing a monthly calendar with coloured event dots on dates. A sidebar lists upcoming events with type badge and date.](docs/screenshots/65-events-calendar.png)
*School calendar view. Different event types are colour-coded.*

---

## 28. Compliance Tracking

### Compliance Dashboard

![Compliance page showing a progress bar at top (14 of 20 items completed) and a table below: compliance item, due date, assigned to, status badge (Pending/Completed/Overdue), and Upload Proof button](docs/screenshots/66-compliance-dashboard.png)
*Compliance dashboard. Overall progress bar and item-by-item status at a glance.*

---

## 29. Yearbook

![Yearbook page showing a grid of student photos with names and quotes below. An Export PDF button is at the top right.](docs/screenshots/67-yearbook.png)
*Yearbook page. Upload photos and captions, then export the whole thing as a PDF.*

---

## 30. Transfer Certificates

![Transfer certificate preview showing school letterhead, student details, dates of study, class, and a signature line. Download PDF and Email buttons at top.](docs/screenshots/68-transfer-certificate.png)
*Generated TC preview. Click Download PDF to print or Email to send directly to the parent.*

---

## 31. Configuration Guide — How Everything Is Set Up

This section explains how school admins and super admins configure Yulaa for their school. Configuration is done once (or updated when policies change) — it's not a daily activity.

---

### 31.1 Master Data — The Dropdowns

Every dropdown menu in Yulaa (blood group, gender, religion, stream, etc.) gets its values from the **Masters** section. If a value isn't in the master, it won't appear in the dropdown.

**Where to find it:** Dashboard → Masters

![Masters section landing page showing a grid of master cards: Gender, Blood Groups, Streams, Grades, Exam Types, Leave Types, Qualifications, and Custom Masters](docs/screenshots/69-masters-landing.png)
*Masters landing page. Each card opens the list of values for that master type.*

#### How to Edit a Master (Example: Blood Groups)

![Blood Groups master page showing a list: A+, A-, B+, B-, AB+, AB-, O+, O- — each with an Edit (pencil) and Deactivate (toggle) button. An Add New button is at the top.](docs/screenshots/70-master-blood-groups.png)
*Blood Groups master. Add a new group, edit the name, or deactivate one you don't use.*

**Steps:**
1. Go to Dashboard → Masters → (Select the master)
2. You see the current list of values
3. Click **Add** to add a new value, or click an existing value to edit/disable it
4. Changes take effect immediately in all forms

![Add new blood group dialog box showing a single text field for the name and Save button](docs/screenshots/71-master-add-value-dialog.png)
*Adding a new value. Just type the name and save. It appears in the dropdown immediately.*

> **Tip:** When you set up a new school on Yulaa for the first time, click **"Seed Standard Masters"** to automatically populate all common dropdown values with sensible defaults. You can then customise from there.

![Seed Standard Masters button on the masters page and confirmation dialog explaining what will be created](docs/screenshots/72-seed-standard-masters.png)
*Seed Standard Masters. One click creates all common dropdown values for a fresh school setup.*

#### Custom Masters

For values not covered by the built-in masters, use **Custom Masters** (e.g., House, Religion, Mother Tongue, Disability Type):

![Custom Masters page showing a list of custom types: Category, Religion, Mother Tongue, House, Boarding Type — each with an arrow to open its values](docs/screenshots/73-custom-masters-list.png)
*Custom masters list. Each type holds a list of values shown in dropdown menus across forms.*

![Custom master values page for Religion showing: Hindu, Muslim, Christian, Sikh, Buddhist — with Add, Edit, and Deactivate options](docs/screenshots/74-custom-master-values.png)
*Values inside a custom master (Religion shown here). Add, edit, or deactivate any value.*

---

### 31.2 Form Configuration — Which Fields Appear in Forms

Yulaa has configurable forms. For each form (Admission, Student, Teacher, etc.), you can control which fields are shown, which are required, and what they are called.

**Where to find it:** Dashboard → Schools → [Your School] → Form Configuration

![Form configuration page showing a list of forms on the left: Admission Form, Student Add Form, Teacher Add Form, etc. The selected form's fields are shown on the right as a list.](docs/screenshots/75-form-config-landing.png)
*Form configuration page. Select a form on the left to edit its fields on the right.*

#### Configuring a Form Field

![Field configuration row showing: field name "Aadhaar No", a visibility toggle (Visible/Hidden), a required toggle, and a label text box showing "Aadhaar Number"](docs/screenshots/76-form-config-field-row.png)
*Each field has three controls: Visible/Hidden toggle, Required toggle, and a label you can rename.*

**How to configure:**
1. Select the form you want to configure
2. A list of all fields appears
3. For each field, set it to: **Visible & Required** / **Visible & Optional** / **Hidden**
4. You can also rename any field label (e.g., rename "Admission No" to "Student ID")
5. Changes take effect immediately

#### Role-Specific Field Visibility

![Form config showing a role tab bar at the top: All Roles / Admin / Teacher / Parent / Student. Different visibility settings are shown for each role.](docs/screenshots/77-form-config-role-tabs.png)
*Different roles can see different fields in the same form. Use the role tabs to configure per role.*

> **Example:** A day school that doesn't need boarding details sets Boarding Type, Diet Type, and Hostel fields to "Hidden" in the Student Add Form. Parents and staff won't see these fields at all.

---

### 31.3 Menu Permissions — What Each Role Can See

You can control which sections of Yulaa are visible to each role.

**Where to find it:** Dashboard → Schools → [Your School] → Menu Permissions

![Menu permissions page showing a table: rows are menu items (Hostel, Transport, Courses, Library, etc.), columns are roles (Admin, Principal, HOD, Teacher, Parent, Student). Each cell is a toggle On/Off.](docs/screenshots/78-menu-permissions.png)
*Menu permissions grid. Turn off entire sections for roles that don't need them.*

**Example uses:**
- Hide the **Hostel** row for all roles if your school doesn't have a hostel
- Show **Courses** only to Students and Parents
- Hide **Payroll** from everyone except Admin

---

### 31.4 Academic Year Setup

**Where to find it:** Dashboard → Schools → [Your School] → Academic Year Cycle

![Academic year cycle page showing a list of years: 2023-2024 (Completed), 2024-2025 (Active - green badge), 2025-2026 (Upcoming). An Add Year button is at the top. Below the list is a Run Year-End Promotion button.](docs/screenshots/79-academic-year-list.png)
*Academic year list. Only one year is Active at a time. Past years are Completed.*

#### Adding a New Academic Year

![Add academic year modal showing fields: Year Label (e.g. 2025-2026), Start Date picker, End Date picker, and Save button](docs/screenshots/80-academic-year-add.png)
*Add a new year. Label it (e.g., 2025-2026), set start and end dates, then save.*

#### Year-End Promotion

![Year-end promotion modal showing a checklist of grade pairs: Grade 5 → Grade 6 ✓, Grade 6 → Grade 7 ✓, Grade 7 → Grade 8 ✓. A Promote X Grades button is at the bottom.](docs/screenshots/81-year-end-promotion.png)
*Year-End Promotion. Tick which grades to promote. Yulaa moves all students automatically.*

**What promotion does:**
- All students in Grade 5 → moved to Grade 6
- All students in Grade 6 → moved to Grade 7
- Students in Grade 12 (final year) are left as is — they graduate

You can choose which grades to promote. Students who are detained (not promoted) are handled manually.

---

### 31.5 Grading Scheme

The grading scheme defines how marks are converted to letter grades.

**Where to find it:** Dashboard → Super Admin → Grading Scheme

![Grading scheme page showing a table: Percentage Range | Grade. Rows: 90-100 = A+, 75-89 = A, 60-74 = B, 45-59 = C, 35-44 = D, 0-34 = F. Edit and Add Band buttons at top.](docs/screenshots/82-grading-scheme.png)
*Grading scheme table. Edit the percentage ranges or add new bands to match your school's system.*

Yulaa applies this scheme automatically whenever marks are entered. If the school uses a custom scheme (e.g., IB grading with 1-7 bands), super admin configures the custom bands.

---

### 31.6 Performance Cycles and Weights

**Where to find it:** Dashboard → Super Admin → KPI Config

![KPI config page showing: Cycle Type dropdown (Quarterly selected), and four weight sliders: Academic 40%, Attendance 30%, Behaviour 20%, Eco Points 10%. A total shows 100%. Save button at bottom.](docs/screenshots/83-kpi-config.png)
*KPI configuration. Adjust the weight sliders. They must always add up to 100%.*

**What to configure:**
1. Which performance cycles are active (monthly, quarterly, half-yearly, annual)
2. The weight of each score component:
   - Academic performance weight (e.g., 40%)
   - Attendance weight (e.g., 30%)
   - Behaviour score weight (e.g., 20%)
   - Eco/house points weight (e.g., 10%)

---

### 31.7 Admission Workflow

Each school configures their own admission approval steps.

**Where to find it:** Dashboard → Admissions → Workflow

![Admission workflow builder page showing three step cards in order: Step 1 - Initial Screening, Step 2 - Principal Review, Step 3 - Final Approval. Each step has a checklist section and an Edit button. An Add Step button is at the bottom.](docs/screenshots/84-admission-workflow-builder.png)
*Admission workflow builder. Steps are shown in order. Drag to reorder. Add/edit/remove steps.*

#### Adding a Checklist to a Step

![Step editor panel showing Step Name field, Reviewer Role dropdown (School Admin selected), and a checklist section with items: "Phone verified", "Birth certificate collected", "Application fee paid". Each has a Required toggle. An Add Item button is at the bottom.](docs/screenshots/85-admission-workflow-step-editor.png)
*Step editor. Name the step, assign who reviews it, and add checklist items. Toggle Required on items that must be completed before the reviewer can advance the application.*

**How to create a workflow:**
1. Click **Add Step**
2. Name the step (e.g., "Initial Screening")
3. Set who reviews at this step (e.g., School Admin)
4. Add checklist items (e.g., "Phone number verified", "Birth certificate collected")
5. Set whether checklist items are **required** before moving to the next step
6. Add more steps as needed

Once the workflow is set, all new applications go through this exact process.

---

### 31.8 Leave Policies

**Where to find it:** Dashboard → Schools → Leave Configuration

![Leave configuration page showing a list of leave types: Casual Leave, Sick Leave, Earned Leave. Each has fields: Max Days/Year, Carry Forward toggle, Accrual toggle (Monthly/Annual), Reset Date.](docs/screenshots/86-leave-config.png)
*Leave policy config. Set the allowance, carry-forward rules, and reset date per leave type.*

**What to configure for each leave type:**
- Number of days allowed per year
- Whether unused leave carries forward to next year
- Whether leave accrues monthly (e.g., 1 day per month) or all at once
- When the balance resets each year

---

### 31.9 Fee Structures

**Where to find it:** Dashboard → Fees → Fee Structure

![Fee structure setup page showing existing fee types in a table and an Add Fee Type button. Clicking Add opens a side panel with fields: Fee Name, Amount, Frequency (Monthly/Quarterly/Annual/One-time), Applicable Classes (multi-select).](docs/screenshots/87-fee-structure-setup.png)
*Fee structure setup. Define each type of fee and which classes it applies to.*

![Add fee type side panel open showing: Fee Name = "Monthly Tuition Fee", Amount = 8000, Frequency = Monthly, Applicable Classes = All Classes, Save button](docs/screenshots/88-fee-structure-add.png)
*Adding a new fee type. Set the name, amount, frequency, and which classes it applies to.*

**How to set up fees:**
1. Create a fee type (e.g., "Monthly Tuition Fee")
2. Set the amount (e.g., ₹8,000)
3. Set the frequency (monthly)
4. Set which classes it applies to (e.g., all classes, or only Grade 9-12)
5. Repeat for each fee type

---

### 31.10 Attendance Configuration

**Where to find it:** Dashboard → Schools → Attendance Settings

![Attendance configuration page showing: Attendance Mode radio buttons (Class Attendance / Subject-wise), Punch System toggle (Off), Holiday Calendar section with a list of holidays and an Add Holiday button, Low Attendance Threshold input showing 75%.](docs/screenshots/89-attendance-config.png)
*Attendance settings. Set the mode, enable the punch system, add holidays, and set the alert threshold.*

**Choices:**
- **Mode:** Class attendance (one record per day) OR Subject-wise (per period)
- **Punch System:** Enable if using biometric/ID card reader devices
- **Holiday Calendar:** Enter all school holidays so they are excluded from attendance calculations
- **Low Attendance Threshold:** Set the percentage below which parents are alerted (e.g., 75%)

---

### 31.11 School-wide Feature Toggles

Super admin can enable or disable entire features for a school.

**Where to find it:** Dashboard → Super Admin → Schools → [School] → Features

![School features page showing a list of toggles: Online Classes (On), Courses (Off), Transport (On), Hostel (Off), Library (On), Career Sessions (Off), Vendors (Off), Compliance (On). Each toggle is On or Off.](docs/screenshots/90-school-feature-toggles.png)
*Feature toggles for a school. Turning a feature Off hides it from all users of that school.*

| Feature | What It Does |
|---------|-------------|
| **Online Classes** | Shows/hides the Online Classes section |
| **Courses** | Shows/hides the Recorded Courses section |
| **Hostel** | Shows/hides the Hostel section |
| **Transport** | Shows/hides the Transport section |
| **Library** | Shows/hides the Library section |
| **Career Sessions** | Shows/hides the Consultant Sessions section |
| **Vendors** | Shows/hides the Vendor Marketplace |
| **Compliance** | Shows/hides the Compliance Tracking section |

---

## 32. Super Admin — Managing the Platform

The **Super Admin** is the Yulaa company account. The super admin has access to everything across all schools.

### All Schools List

![Super admin schools page showing a table of all schools: name, city, student count, teacher count, plan badge (Basic/Standard/Premium), status badge (Active/Inactive), and a View button](docs/screenshots/91-super-admin-schools-list.png)
*Super admin sees all schools on the platform in one table.*

### Creating a New School

![Add school form showing: School Name, Address, Email, Phone, Board Type dropdown, Subscription Plan dropdown, Logo upload, and Create School button. A second step shows Create Admin fields: Name, Email, Temporary Password.](docs/screenshots/92-super-admin-create-school.png)
*Create new school form. Fill school details, then create the first admin account for that school.*

1. Go to Super Admin → Schools → Add School
2. Fill in school details (name, address, board type, subscription plan, logo)
3. Create the school admin user (email + temporary password)
4. Enable the features this school has access to
5. Save

The school admin receives login credentials and can start setting up their school.

### Subject Catalogue

![Subject catalogue page showing a grade selector dropdown (Grade 9 selected) and a list of subjects for that grade: Mathematics, Science, English, Social Studies, Hindi, Computer Science — with Add Subject and Remove buttons](docs/screenshots/93-subject-catalogue.png)
*Subject catalogue. Super admin defines which subjects are available per grade.*

### Report Card Templates

![Report card template editor showing a preview of the card layout on the left and configuration options on the right: toggle sections (Academic Table, Skills Chart, Behaviour Score, Attendance, Teacher Comments), logo position, and footer text.](docs/screenshots/94-report-card-template.png)
*Report card template editor. Toggle sections on/off, adjust layout, and set the footer.*

### Eco Points Matrix

![Eco points matrix page showing a table: Activity Name (Planting a tree, Saving electricity, Waste sorting), Points Awarded (10, 5, 8), Category (Environmental, Energy, Waste). Add Activity button at top.](docs/screenshots/95-eco-points-matrix.png)
*Eco points matrix. Define activities and how many points each one awards.*

### Platform Users

![Platform users page showing a searchable table of all users across all schools: name, email, role badge, school name, status badge (Active/Inactive), and Reset Password button](docs/screenshots/96-super-admin-all-users.png)
*All platform users. Super admin can search across all schools for troubleshooting or account recovery.*

---

## Quick Reference: Who Can Do What

| Action | Who Can Do It |
|--------|--------------|
| Create a school | Super Admin |
| Add school admin | Super Admin |
| Add students | School Admin |
| Add teachers | School Admin |
| Approve admissions | School Admin, Principal, HOD |
| Mark attendance | Teacher, Class Teacher |
| Create exams | Teacher, School Admin |
| Enter exam results | Teacher |
| Approve exam results | HOD, Principal |
| Create fee structures | School Admin, Accountant |
| Generate fee invoices | School Admin, Accountant |
| Record payments | Accountant |
| Approve leave | HOD, Principal, School Admin |
| Create announcements | School Admin, Principal, Teacher |
| Configure forms | Super Admin, School Admin |
| Configure master data | School Admin |
| Generate report cards | Principal, School Admin |
| View child's attendance | Parent |
| Pay fees | Parent |
| View homework | Student, Parent |
| Join online class | Student, Parent |
| Book career session | Student, Parent |
| Submit support query | Everyone |
| Manage platform | Super Admin only |

---

## Screenshot Checklist for Documentation Team

The table below lists every screenshot file needed. Take these from the live/staging environment and place them in `docs/screenshots/`.

| File | What to Capture |
|------|----------------|
| 01-login-page.png | Login screen with email/password fields |
| 02-first-login-set-password.png | "Set new password" screen on first login |
| 03-forgot-password.png | Forgot password email entry screen |
| 04-dashboard-admin.png | Admin/Principal dashboard with all stat cards |
| 05-dashboard-teacher.png | Teacher dashboard |
| 06-dashboard-parent.png | Parent dashboard with child's info |
| 07-dashboard-student.png | Student dashboard with timetable |
| 08-admission-public-form.png | Public application form (no login) |
| 09-admissions-list.png | Admin's list of all admission applications |
| 10-admission-detail.png | Single application detail with risk score |
| 11-students-list.png | Students table with search and filters |
| 12-student-add-form.png | Add Student modal/form |
| 13-students-bulk-import-result.png | Import result modal |
| 14-teacher-add-form.png | Add Teacher form |
| 15-parent-portal-overview.png | Parent home after login |
| 16-parent-child-switcher.png | Child switcher dropdown |
| 17-attendance-mark.png | Teacher marking class attendance |
| 18-attendance-calendar.png | Monthly calendar for parent/student |
| 19-attendance-report.png | Attendance report table |
| 20-attendance-regularization.png | Regularization request form |
| 21-fee-structure.png | Fee structure list |
| 22-fee-invoices-list.png | Invoice list with statuses |
| 23-fee-record-payment.png | Record payment modal |
| 24-fee-concession.png | Concession approval form |
| 25-fee-report.png | Fee collection report |
| 26-exams-list.png | Exams list page |
| 27-exam-create-form.png | Create exam form |
| 28-exam-results-entry.png | Results entry grid |
| 29-exam-results-approval.png | HOD/Principal approval screen |
| 30-exam-results-parent-view.png | Published results (parent/student view) |
| 31-performance-dashboard.png | Performance dashboard with risk flags |
| 32-report-card-preview.png | Generated report card PDF preview |
| 33-risk-flags.png | Risk flags list |
| 34-homework-teacher-list.png | Teacher's homework list |
| 35-homework-create.png | Create homework form |
| 36-homework-submissions.png | Submission tracker |
| 37-homework-student-view.png | Student homework view |
| 38-timetable-week-view.png | Weekly timetable grid |
| 39-timetable-teacher-view.png | Teacher's personal timetable |
| 40-syllabus-plan.png | Syllabus plan tree |
| 41-syllabus-coverage.png | Syllabus coverage chart |
| 42-leave-balance.png | Leave balance widget |
| 43-leave-apply-form.png | Leave application form |
| 44-leave-approval-list.png | Pending leave requests (HOD/Principal) |
| 45-leave-history.png | Staff leave history |
| 46-announcements-list.png | Announcements feed |
| 47-announcement-create.png | Create announcement form |
| 48-online-classes-list.png | Online classes schedule |
| 49-online-class-schedule.png | Schedule online class form |
| 50-online-class-attendance.png | Online class attendance marking |
| 51-courses-browse.png | Course browse page |
| 52-course-detail-student.png | Course player with progress |
| 53-course-manage-teacher.png | Teacher course management |
| 54-career-consultants-browse.png | Consultant browse page |
| 55-career-session-book.png | Session booking calendar |
| 56-queries-admin-inbox.png | Split-screen query inbox |
| 57-queries-new-form.png | New query form |
| 58-notifications-panel.png | Notification dropdown |
| 59-transport-routes.png | Transport routes and stops |
| 60-hostel-room-grid.png | Hostel room grid |
| 61-library-catalogue.png | Library book catalogue |
| 62-library-issue-log.png | Issue and return log |
| 63-inventory-list.png | School inventory list |
| 64-vendor-marketplace.png | Vendor marketplace |
| 65-events-calendar.png | Events calendar |
| 66-compliance-dashboard.png | Compliance tracking dashboard |
| 67-yearbook.png | Yearbook photo grid |
| 68-transfer-certificate.png | TC preview |
| 69-masters-landing.png | Masters landing page grid |
| 70-master-blood-groups.png | Blood groups master values list |
| 71-master-add-value-dialog.png | Add new master value dialog |
| 72-seed-standard-masters.png | Seed Standard Masters button + dialog |
| 73-custom-masters-list.png | Custom masters list |
| 74-custom-master-values.png | Values inside a custom master |
| 75-form-config-landing.png | Form configuration landing |
| 76-form-config-field-row.png | Field row with visibility/required toggles |
| 77-form-config-role-tabs.png | Role tabs in form configuration |
| 78-menu-permissions.png | Menu permissions grid |
| 79-academic-year-list.png | Academic years list |
| 80-academic-year-add.png | Add academic year modal |
| 81-year-end-promotion.png | Year-end promotion checklist modal |
| 82-grading-scheme.png | Grading scheme table |
| 83-kpi-config.png | KPI weights configuration |
| 84-admission-workflow-builder.png | Workflow builder with steps |
| 85-admission-workflow-step-editor.png | Step editor with checklist |
| 86-leave-config.png | Leave policy configuration |
| 87-fee-structure-setup.png | Fee structure setup page |
| 88-fee-structure-add.png | Add fee type panel |
| 89-attendance-config.png | Attendance settings page |
| 90-school-feature-toggles.png | Feature on/off toggles |
| 91-super-admin-schools-list.png | Super admin all schools list |
| 92-super-admin-create-school.png | Create school form |
| 93-subject-catalogue.png | Subject catalogue per grade |
| 94-report-card-template.png | Report card template editor |
| 95-eco-points-matrix.png | Eco points activity matrix |
| 96-super-admin-all-users.png | All platform users table |

---

*Document covers Yulaa 2.0 — all modules and configurations as implemented.*
*Last updated: May 2026*
