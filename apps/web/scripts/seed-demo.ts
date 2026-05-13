/**
 * Additional demo data seed — covers all modules not in seed-db.ts
 * Modules: timetable, syllabus, exams+results, events, online-classes, courses,
 *          leave-requests, queries, compliance, holiday-calendar, letter-templates,
 *          fee-payments, homework-submissions, transport-buses+rides,
 *          leave-balance-policies, teacher-leave-balances, admission-applications,
 *          vendor-orders+products, school-inventory, session-bookings
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Reuse fixed IDs from base seed ──────────────────────────────────────────
const IDs = {
  schools:  { dps: '10000000-0000-0000-0000-000000000001', stmary: '10000000-0000-0000-0000-000000000002' },
  users: {
    superAdmin:    '20000000-0000-0000-0000-000000000001',
    dpsAdmin:      '20000000-0000-0000-0000-000000000002',
    priyaTeacher:  '20000000-0000-0000-0000-000000000003',
    amitTeacher:   '20000000-0000-0000-0000-000000000004',
    vikramParent:  '20000000-0000-0000-0000-000000000005',
    nehaParent:    '20000000-0000-0000-0000-000000000006',
    vendor:        '20000000-0000-0000-0000-000000000009',
    consultant:    '20000000-0000-0000-0000-000000000010',
  },
  classes:  { dps5A: '30000000-0000-0000-0000-000000000001', dps5B: '30000000-0000-0000-0000-000000000002', dps6A: '30000000-0000-0000-0000-000000000003', dps7A: '30000000-0000-0000-0000-000000000004' },
  teachers: { priya: '40000000-0000-0000-0000-000000000001', amit: '40000000-0000-0000-0000-000000000002' },
  students: { aarav: '50000000-0000-0000-0000-000000000001', ananya: '50000000-0000-0000-0000-000000000002', ishaan: '50000000-0000-0000-0000-000000000003', diya: '50000000-0000-0000-0000-000000000004', kavya: '50000000-0000-0000-0000-000000000007', rohan: '50000000-0000-0000-0000-000000000008' },
  parents:  { vikram: '60000000-0000-0000-0000-000000000001', neha: '60000000-0000-0000-0000-000000000002' },
  vendor:   '80000000-0000-0000-0000-000000000001',
  consultants: { meera: '90000000-0000-0000-0000-000000000001' },
};

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

async function seed() {
  console.log('\n🌱  Adding rich demo data...\n');

  // ── 1. Holiday Calendar ──────────────────────────────────────────────────────
  console.log('  → Holiday Calendar');
  const holidays = [
    { date: new Date('2025-08-15'), name: 'Independence Day',          type: 'mandatory' },
    { date: new Date('2025-10-02'), name: 'Gandhi Jayanti',            type: 'mandatory' },
    { date: new Date('2025-10-24'), name: 'Dussehra',                  type: 'mandatory' },
    { date: new Date('2025-11-01'), name: 'Diwali',                    type: 'mandatory' },
    { date: new Date('2025-11-05'), name: 'Diwali Vacation (Day 2)',   type: 'mandatory' },
    { date: new Date('2026-01-26'), name: 'Republic Day',              type: 'mandatory' },
    { date: new Date('2026-03-14'), name: 'Holi',                      type: 'mandatory' },
    { date: new Date('2026-04-14'), name: 'Ambedkar Jayanti',          type: 'mandatory' },
  ];
  for (const h of holidays) {
    await prisma.holidayCalendar.upsert({
      where: { schoolId_date: { schoolId: IDs.schools.dps, date: h.date } },
      update: {},
      create: { schoolId: IDs.schools.dps, academicYear: '2025-2026', ...h },
    });
  }

  // ── 2. Timetable for Grade 5-A ────────────────────────────────────────────
  console.log('  → Timetable (Grade 5-A)');
  const ttId = 'tt000001-0000-0000-0000-000000000001';
  await prisma.timetable.upsert({
    where: { schoolId_classId_academicYear: { schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, academicYear: '2025-2026' } },
    update: {},
    create: { id: ttId, schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, academicYear: '2025-2026' },
  });

  // Mon-Fri (1=Mon … 5=Fri), 6 periods per day
  const periods = [
    { start: '08:00', end: '08:45' }, { start: '08:45', end: '09:30' },
    { start: '09:45', end: '10:30' }, { start: '10:30', end: '11:15' },
    { start: '11:30', end: '12:15' }, { start: '12:15', end: '13:00' },
  ];
  // subject rotation per day
  const daySubjects: Record<number, string[]> = {
    1: ['Mathematics',   'Science',       'English',      'Social Studies', 'Art',         'Physical Education'],
    2: ['English',       'Mathematics',   'Hindi',        'Science',        'Mathematics', 'Music'],
    3: ['Science',       'Social Studies','Mathematics',  'English',        'Hindi',       'Computers'],
    4: ['Hindi',         'English',       'Science',      'Mathematics',    'Social Studies','Physical Education'],
    5: ['Mathematics',   'Hindi',         'Social Studies','Science',       'English',     'Art'],
  };
  const subjectTeacher: Record<string, string> = {
    Mathematics: IDs.teachers.priya, Science: IDs.teachers.priya,
    English: IDs.teachers.amit,      Hindi: IDs.teachers.amit,
    'Social Studies': IDs.teachers.amit,
  };
  const slots: { id: string; timetableId: string; dayOfWeek: number; periodNo: number; startTime: string; endTime: string; subject: string; teacherId?: string }[] = [];
  for (const [day, subjects] of Object.entries(daySubjects)) {
    for (let p = 0; p < subjects.length; p++) {
      const subj = subjects[p];
      const slotId = `slot${day.padStart(2,'0')}${String(p+1).padStart(2,'0')}-0000-0000-0000-000000000001`;
      slots.push({ id: slotId, timetableId: ttId, dayOfWeek: Number(day), periodNo: p + 1, startTime: periods[p].start, endTime: periods[p].end, subject: subj, teacherId: subjectTeacher[subj] });
    }
  }
  for (const slot of slots) {
    await prisma.timetableSlot.upsert({
      where: { timetableId_dayOfWeek_periodNo: { timetableId: ttId, dayOfWeek: slot.dayOfWeek, periodNo: slot.periodNo } },
      update: {},
      create: slot,
    });
  }

  // ── 3. Syllabus Items ────────────────────────────────────────────────────────
  console.log('  → Syllabus (Grade 5-A, Mathematics + Science)');
  const syllabusItems = [
    // Mathematics
    { subject: 'Mathematics', chapter: 'Chapter 1', topic: 'Large Numbers',              orderNo: 1,  status: 'completed', startDate: new Date('2025-04-05'), endDate: new Date('2025-04-12'), completedAt: new Date('2025-04-12'), teacherId: IDs.teachers.priya },
    { subject: 'Mathematics', chapter: 'Chapter 2', topic: 'Addition & Subtraction',     orderNo: 2,  status: 'completed', startDate: new Date('2025-04-14'), endDate: new Date('2025-04-20'), completedAt: new Date('2025-04-19'), teacherId: IDs.teachers.priya },
    { subject: 'Mathematics', chapter: 'Chapter 3', topic: 'Multiplication',             orderNo: 3,  status: 'completed', startDate: new Date('2025-04-22'), endDate: new Date('2025-04-30'), completedAt: new Date('2025-04-29'), teacherId: IDs.teachers.priya },
    { subject: 'Mathematics', chapter: 'Chapter 4', topic: 'Division',                   orderNo: 4,  status: 'completed', startDate: new Date('2025-05-02'), endDate: new Date('2025-05-10'), completedAt: new Date('2025-05-10'), teacherId: IDs.teachers.priya },
    { subject: 'Mathematics', chapter: 'Chapter 5', topic: 'Fractions',                  orderNo: 5,  status: 'in_progress', startDate: daysAgo(10), endDate: daysAhead(5), teacherId: IDs.teachers.priya },
    { subject: 'Mathematics', chapter: 'Chapter 6', topic: 'Decimals',                   orderNo: 6,  status: 'pending',     startDate: daysAhead(6), endDate: daysAhead(15), teacherId: IDs.teachers.priya },
    { subject: 'Mathematics', chapter: 'Chapter 7', topic: 'Percentages',                orderNo: 7,  status: 'pending',     startDate: daysAhead(16), endDate: daysAhead(25), teacherId: IDs.teachers.priya },
    { subject: 'Mathematics', chapter: 'Chapter 8', topic: 'Geometry – Shapes',          orderNo: 8,  status: 'pending',     startDate: daysAhead(26), endDate: daysAhead(35), teacherId: IDs.teachers.priya },
    // Science
    { subject: 'Science', chapter: 'Chapter 1', topic: 'Plants & Photosynthesis',        orderNo: 1,  status: 'completed', startDate: new Date('2025-04-05'), endDate: new Date('2025-04-14'), completedAt: new Date('2025-04-14'), teacherId: IDs.teachers.priya },
    { subject: 'Science', chapter: 'Chapter 2', topic: 'Animals & Habitats',             orderNo: 2,  status: 'completed', startDate: new Date('2025-04-16'), endDate: new Date('2025-04-26'), completedAt: new Date('2025-04-25'), teacherId: IDs.teachers.priya },
    { subject: 'Science', chapter: 'Chapter 3', topic: 'Human Body Systems',             orderNo: 3,  status: 'completed', startDate: new Date('2025-04-28'), endDate: new Date('2025-05-08'), completedAt: new Date('2025-05-07'), teacherId: IDs.teachers.priya },
    { subject: 'Science', chapter: 'Chapter 4', topic: 'Matter & States',                orderNo: 4,  status: 'in_progress', startDate: daysAgo(8), endDate: daysAhead(4), teacherId: IDs.teachers.priya },
    { subject: 'Science', chapter: 'Chapter 5', topic: 'Force & Motion',                 orderNo: 5,  status: 'pending', startDate: daysAhead(5), endDate: daysAhead(16), teacherId: IDs.teachers.priya },
    { subject: 'Science', chapter: 'Chapter 6', topic: 'Light & Shadow',                 orderNo: 6,  status: 'pending', startDate: daysAhead(17), endDate: daysAhead(28), teacherId: IDs.teachers.priya },
  ];
  for (const item of syllabusItems) {
    await prisma.syllabusItem.create({
      data: { schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, academicYear: '2025-2026', ...item },
    }).catch(() => {});
  }

  // ── 4. Exams + Results ───────────────────────────────────────────────────────
  console.log('  → Exams & Results');
  const exam1Id = 'exam0001-0000-0000-0000-000000000001';
  const exam2Id = 'exam0001-0000-0000-0000-000000000002';

  await prisma.exam.upsert({
    where: { id: exam1Id },
    update: {},
    create: { id: exam1Id, schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, title: 'Unit Test 1 – Grade 5A', examType: 'Unit Test 1', academicYear: '2025-2026', startDate: new Date('2025-05-15'), endDate: new Date('2025-05-17'), status: 'completed', gradingType: 'percentage' },
  });
  await prisma.exam.upsert({
    where: { id: exam2Id },
    update: {},
    create: { id: exam2Id, schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, title: 'Mid Term – Grade 5A',   examType: 'Mid Term',    academicYear: '2025-2026', startDate: daysAhead(20), endDate: daysAhead(24), status: 'scheduled', gradingType: 'percentage' },
  });

  // Exam 1 entries
  for (const [subject, date] of [['Mathematics', '2025-05-15'], ['Science', '2025-05-16'], ['English', '2025-05-17']]) {
    await prisma.examTimetableEntry.upsert({
      where: { examId_classId_subject: { examId: exam1Id, classId: IDs.classes.dps5A, subject } },
      update: {},
      create: { examId: exam1Id, classId: IDs.classes.dps5A, subject, date: new Date(date), startTime: '09:00', endTime: '11:00', maxMarks: 50 },
    });
  }

  // Exam 1 results for 4 students
  const resultsData = [
    { studentId: IDs.students.aarav,  maths: 45, science: 42, english: 38 },
    { studentId: IDs.students.ananya, maths: 48, science: 46, english: 44 },
    { studentId: IDs.students.kavya,  maths: 35, science: 39, english: 41 },
    { studentId: IDs.students.rohan,  maths: 28, science: 31, english: 29 },
  ];
  const gradeFor = (m: number, max: number) => {
    const pct = (m / max) * 100;
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A'; if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';  if (pct >= 50) return 'C'; if (pct >= 33) return 'D'; return 'F';
  };
  for (const r of resultsData) {
    for (const [subject, marks] of [['Mathematics', r.maths], ['Science', r.science], ['English', r.english]]) {
      await prisma.examResult.upsert({
        where: { examId_studentId_subject: { examId: exam1Id, studentId: r.studentId, subject: subject as string } },
        update: {},
        create: { examId: exam1Id, studentId: r.studentId, subject: subject as string, marksObtained: marks as number, maxMarks: 50, grade: gradeFor(marks as number, 50), enteredById: IDs.users.priyaTeacher, approved: true, approvedById: IDs.users.dpsAdmin },
      });
    }
  }

  // ── 5. School Events ─────────────────────────────────────────────────────────
  console.log('  → School Events');
  const eventsData = [
    { id: 'evt00001-0000-0000-0000-000000000001', title: 'Annual Sports Day 2026',         description: 'Inter-house sports competition with track & field events.',        eventType: 'Sports',   startDate: daysAhead(30), endDate: daysAhead(30), venue: 'School Sports Ground',  status: 'upcoming' },
    { id: 'evt00001-0000-0000-0000-000000000002', title: 'Annual Day Celebration',         description: 'Cultural programme showcasing student talent.',                    eventType: 'Cultural', startDate: daysAhead(60), endDate: daysAhead(60), venue: 'School Auditorium',     status: 'upcoming' },
    { id: 'evt00001-0000-0000-0000-000000000003', title: 'Parent-Teacher Meeting – Term 2',description: 'Progress discussion between parents and class teachers.',          eventType: 'Academic', startDate: daysAhead(14), endDate: daysAhead(14), venue: 'Respective Classrooms', status: 'upcoming' },
    { id: 'evt00001-0000-0000-0000-000000000004', title: 'Science Exhibition',             description: 'Students showcase innovative science projects.',                   eventType: 'Academic', startDate: daysAgo(15),   endDate: daysAgo(14),   venue: 'School Hall',          status: 'completed' },
    { id: 'evt00001-0000-0000-0000-000000000005', title: 'Independence Day Celebration',   description: 'Flag hoisting, march-past and cultural performances.',             eventType: 'Cultural', startDate: new Date('2025-08-15'), endDate: new Date('2025-08-15'), venue: 'School Ground', status: 'completed' },
  ];
  for (const e of eventsData) {
    await prisma.schoolEvent.upsert({
      where: { id: e.id },
      update: {},
      create: { ...e, schoolId: IDs.schools.dps, academicYear: '2025-2026', createdBy: IDs.users.dpsAdmin },
    });
  }

  // Event tasks for Sports Day
  const sportsTasks = [
    { title: 'Prepare track & field',  assignedTo: IDs.teachers.priya, status: 'in_progress', dueDate: daysAhead(25) },
    { title: 'Arrange refreshments',   assignedTo: IDs.teachers.amit,  status: 'pending',      dueDate: daysAhead(28) },
    { title: 'Design event t-shirts',  assignedTo: null,                status: 'pending',      dueDate: daysAhead(20) },
  ];
  for (const t of sportsTasks) {
    await prisma.eventTask.create({
      data: { eventId: 'evt00001-0000-0000-0000-000000000001', ...t },
    }).catch(() => {});
  }

  // Event participants for Science Exhibition (completed)
  for (const studentId of [IDs.students.aarav, IDs.students.ananya, IDs.students.diya]) {
    await prisma.eventParticipant.upsert({
      where: { eventId_studentId: { eventId: 'evt00001-0000-0000-0000-000000000004', studentId } },
      update: {},
      create: { eventId: 'evt00001-0000-0000-0000-000000000004', studentId, status: 'registered', attended: true, role: 'Exhibitor' },
    });
  }

  // ── 6. Online Classes ────────────────────────────────────────────────────────
  console.log('  → Online Classes');
  const ocData = [
    { id: 'oc000001-0000-0000-0000-000000000001', title: 'Mathematics Revision – Fractions',    subject: 'Mathematics', classId: IDs.classes.dps5A, teacherId: IDs.teachers.priya, scheduledAt: daysAhead(3),  durationMinutes: 60,  meetingLink: 'https://meet.google.com/abc-defg-hij', status: 'scheduled' },
    { id: 'oc000001-0000-0000-0000-000000000002', title: 'Science – States of Matter',          subject: 'Science',     classId: IDs.classes.dps5A, teacherId: IDs.teachers.priya, scheduledAt: daysAhead(5),  durationMinutes: 45,  meetingLink: 'https://meet.google.com/klm-nopq-rst', status: 'scheduled' },
    { id: 'oc000001-0000-0000-0000-000000000003', title: 'English – Essay Writing Workshop',    subject: 'English',     classId: IDs.classes.dps5B, teacherId: IDs.teachers.amit,  scheduledAt: daysAhead(7),  durationMinutes: 60,  meetingLink: 'https://zoom.us/j/123456789',          status: 'scheduled' },
    { id: 'oc000001-0000-0000-0000-000000000004', title: 'Mathematics – Division Practice',     subject: 'Mathematics', classId: IDs.classes.dps5A, teacherId: IDs.teachers.priya, scheduledAt: daysAgo(5),    durationMinutes: 60,  meetingLink: 'https://meet.google.com/uvw-xyza-bcd', status: 'completed' },
    { id: 'oc000001-0000-0000-0000-000000000005', title: 'Science – Plant Cell Diagram',        subject: 'Science',     classId: IDs.classes.dps5A, teacherId: IDs.teachers.priya, scheduledAt: daysAgo(10),   durationMinutes: 45,  meetingLink: 'https://meet.google.com/efg-hijk-lmn', status: 'completed' },
  ];
  for (const oc of ocData) {
    await prisma.onlineClass.upsert({
      where: { id: oc.id },
      update: {},
      create: { ...oc, schoolId: IDs.schools.dps },
    });
  }

  // Attendance for completed online classes
  for (const studentId of [IDs.students.aarav, IDs.students.ananya, IDs.students.kavya]) {
    await prisma.onlineClassAttendance.upsert({
      where: { onlineClassId_studentId: { onlineClassId: 'oc000001-0000-0000-0000-000000000004', studentId } },
      update: {},
      create: { onlineClassId: 'oc000001-0000-0000-0000-000000000004', studentId, status: 'present', joinedAt: daysAgo(5) },
    }).catch(() => {});
    await prisma.onlineClassAttendance.upsert({
      where: { onlineClassId_studentId: { onlineClassId: 'oc000001-0000-0000-0000-000000000005', studentId } },
      update: {},
      create: { onlineClassId: 'oc000001-0000-0000-0000-000000000005', studentId, status: 'present', joinedAt: daysAgo(10) },
    }).catch(() => {});
  }
  // Rohan was absent
  await prisma.onlineClassAttendance.upsert({
    where: { onlineClassId_studentId: { onlineClassId: 'oc000001-0000-0000-0000-000000000004', studentId: IDs.students.rohan } },
    update: {},
    create: { onlineClassId: 'oc000001-0000-0000-0000-000000000004', studentId: IDs.students.rohan, status: 'absent' },
  }).catch(() => {});

  // ── 7. Courses ───────────────────────────────────────────────────────────────
  console.log('  → Courses');
  const course1Id = 'crs00001-0000-0000-0000-000000000001';
  const course2Id = 'crs00001-0000-0000-0000-000000000002';
  await prisma.course.upsert({
    where: { id: course1Id },
    update: {},
    create: { id: course1Id, schoolId: IDs.schools.dps, teacherId: IDs.teachers.priya, title: 'Maths Mastery – Grade 5', description: 'A complete revision course covering all Grade 5 Maths chapters with practice exercises and quizzes.', totalDuration: 1200, isPublished: true, isFree: true, targetGrades: ['Grade 5'], tags: ['maths', 'grade5'] },
  });
  await prisma.course.upsert({
    where: { id: course2Id },
    update: {},
    create: { id: course2Id, schoolId: IDs.schools.dps, teacherId: IDs.teachers.amit,  title: 'English Speaking & Writing', description: 'Build confidence in spoken and written English through fun exercises, stories, and debates.', totalDuration: 900, isPublished: true, isFree: true, targetGrades: ['Grade 5', 'Grade 6'], tags: ['english', 'language'] },
  });

  // Course modules
  const mathModules = [
    { title: 'Introduction to Large Numbers',     description: 'Reading, writing, comparing numbers up to 10 lakhs.',  orderNo: 1, durationMinutes: 45, status: 'published' },
    { title: 'Fractions – Part 1',                description: 'Proper, improper, and mixed fractions.',               orderNo: 2, durationMinutes: 45, status: 'published' },
    { title: 'Fractions – Part 2',                description: 'Addition, subtraction and comparison of fractions.',   orderNo: 3, durationMinutes: 50, status: 'published' },
    { title: 'Decimals',                          description: 'Place value and operations with decimal numbers.',     orderNo: 4, durationMinutes: 45, status: 'published' },
    { title: 'Practice Test',                     description: 'End of course practice test with solutions.',          orderNo: 5, durationMinutes: 30, status: 'published' },
  ];
  for (const m of mathModules) {
    await prisma.courseModule.create({
      data: { courseId: course1Id, ...m },
    }).catch(() => {});
  }

  // Enrollments + Progress
  for (const [studentId, pct] of [
    [IDs.students.aarav, 60], [IDs.students.ananya, 100], [IDs.students.kavya, 40], [IDs.students.rohan, 20],
  ] as [string, number][]) {
    await prisma.courseEnrollment.upsert({
      where: { courseId_userId: { courseId: course1Id, userId: studentId } },
      update: {},
      create: { courseId: course1Id, userId: studentId, studentId, enrolledAt: daysAgo(20), progressPct: pct, paymentStatus: 'free', completedAt: pct >= 100 ? daysAgo(2) : null },
    }).catch(() => {});
  }

  // ── 8. Leave Requests ────────────────────────────────────────────────────────
  console.log('  → Leave Requests');
  const lr1Id = 'lr000001-0000-0000-0000-000000000001';
  const lr2Id = 'lr000001-0000-0000-0000-000000000002';
  const lr3Id = 'lr000001-0000-0000-0000-000000000003';

  await prisma.leaveRequest.upsert({ where: { id: lr1Id }, update: {}, create: { id: lr1Id, schoolId: IDs.schools.dps, userId: IDs.users.priyaTeacher, roleCode: 'teacher', leaveType: 'sick', startDate: daysAgo(10), endDate: daysAgo(8), reason: 'Fever and viral infection — doctor advised rest for 3 days.', status: 'approved', currentStep: 4, reviewedBy: IDs.users.dpsAdmin, reviewedAt: daysAgo(10) } });
  await prisma.leaveRequest.upsert({ where: { id: lr2Id }, update: {}, create: { id: lr2Id, schoolId: IDs.schools.dps, userId: IDs.users.amitTeacher,  roleCode: 'teacher', leaveType: 'casual', startDate: daysAhead(5), endDate: daysAhead(6), reason: 'Family function — attending sister\'s wedding ceremony.', status: 'pending', currentStep: 2 } });
  await prisma.leaveRequest.upsert({ where: { id: lr3Id }, update: {}, create: { id: lr3Id, schoolId: IDs.schools.dps, userId: IDs.users.vikramParent, roleCode: 'parent', leaveType: 'other', startDate: daysAhead(3), endDate: daysAhead(3), reason: 'Child Aarav needs to attend a medical check-up.', status: 'pending', currentStep: 1, studentId: IDs.students.aarav } });

  await prisma.leaveAction.create({ data: { leaveId: lr1Id, actorUserId: IDs.users.priyaTeacher, stepOrder: 1, action: 'submit',  comment: 'Applying for sick leave due to viral fever.' } }).catch(() => {});
  await prisma.leaveAction.create({ data: { leaveId: lr1Id, actorUserId: IDs.users.dpsAdmin,     stepOrder: 4, action: 'approve', comment: 'Get well soon. Leave approved.'               } }).catch(() => {});
  await prisma.leaveAction.create({ data: { leaveId: lr2Id, actorUserId: IDs.users.amitTeacher,  stepOrder: 1, action: 'submit',  comment: 'Requesting casual leave for wedding.'          } }).catch(() => {});

  // ── 9. Teacher Leave Balances ────────────────────────────────────────────────
  console.log('  → Teacher Leave Balances');
  const balances = [
    { teacherId: IDs.teachers.priya, leaveType: 'sick',      totalDays: 12, usedDays: 3 },
    { teacherId: IDs.teachers.priya, leaveType: 'casual',    totalDays: 10, usedDays: 1 },
    { teacherId: IDs.teachers.priya, leaveType: 'earned',    totalDays: 15, usedDays: 0 },
    { teacherId: IDs.teachers.amit,  leaveType: 'sick',      totalDays: 12, usedDays: 0 },
    { teacherId: IDs.teachers.amit,  leaveType: 'casual',    totalDays: 10, usedDays: 0 },
    { teacherId: IDs.teachers.amit,  leaveType: 'earned',    totalDays: 15, usedDays: 2 },
  ];
  for (const b of balances) {
    await prisma.teacherLeaveBalance.upsert({
      where: { schoolId_teacherId_leaveType_academicYear: { schoolId: IDs.schools.dps, teacherId: b.teacherId, leaveType: b.leaveType, academicYear: '2025-26' } },
      update: {},
      create: { schoolId: IDs.schools.dps, academicYear: '2025-26', ...b },
    });
  }

  // ── 10. Leave Balance Policies ────────────────────────────────────────────────
  console.log('  → Leave Balance Policies');
  const sickTypeId = (await prisma.leaveTypeMaster.findFirst({ where: { schoolId: IDs.schools.dps, code: 'sick' } }))?.id;
  const casTypeId  = (await prisma.leaveTypeMaster.findFirst({ where: { schoolId: IDs.schools.dps, code: 'casual' } }))?.id;
  if (sickTypeId) {
    for (const roleCode of ['teacher', 'employee']) {
      await prisma.leaveBalancePolicy.upsert({
        where: { schoolId_leaveTypeId_roleCode: { schoolId: IDs.schools.dps, leaveTypeId: sickTypeId, roleCode } },
        update: {},
        create: { schoolId: IDs.schools.dps, leaveTypeId: sickTypeId, roleCode, daysPerYear: 12, carryForward: false },
      });
    }
  }
  if (casTypeId) {
    for (const roleCode of ['teacher', 'employee']) {
      await prisma.leaveBalancePolicy.upsert({
        where: { schoolId_leaveTypeId_roleCode: { schoolId: IDs.schools.dps, leaveTypeId: casTypeId, roleCode } },
        update: {},
        create: { schoolId: IDs.schools.dps, leaveTypeId: casTypeId, roleCode, daysPerYear: 10, carryForward: true, maxCarryDays: 5 },
      });
    }
  }

  // ── 11. Queries ───────────────────────────────────────────────────────────────
  console.log('  → Student Queries');
  const queries = [
    { schoolId: IDs.schools.dps, parentId: IDs.parents.vikram, studentId: IDs.students.aarav,  subject: 'Attendance correction request', message: 'Aarav was marked absent on 5th May but he was present. Please check and correct the record.', status: 'resolved', response: 'We have reviewed and corrected the attendance. Aarav is now marked Present on 5th May. Apologies for the error.', respondedBy: IDs.users.dpsAdmin, respondedAt: daysAgo(5) },
    { schoolId: IDs.schools.dps, parentId: IDs.parents.vikram, studentId: IDs.students.ananya, subject: 'Fee receipt request',            message: 'Could you please share the fee receipt for Term 1 payment? I need it for income tax purposes.', status: 'resolved', response: 'Fee receipt has been sent to your registered email. You can also download it from the portal under Fees → Invoice → Download PDF.', respondedBy: IDs.users.dpsAdmin, respondedAt: daysAgo(12) },
    { schoolId: IDs.schools.dps, parentId: IDs.parents.neha,   studentId: IDs.students.ishaan, subject: 'Request for extra classes',      message: 'Ishaan is struggling with fractions. Are extra maths classes available?', status: 'open',     response: null, respondedBy: null, respondedAt: null },
    { schoolId: IDs.schools.dps, parentId: IDs.parents.vikram, studentId: IDs.students.aarav,  subject: 'Bus route change request',       message: 'We have moved to Sector 22. Can Aarav be transferred to the Sector 22-30 bus route?', status: 'in_progress', response: 'We have noted your request. The transport coordinator will contact you within 2 working days.', respondedBy: IDs.users.dpsAdmin, respondedAt: daysAgo(2) },
  ];
  for (const q of queries) {
    await prisma.studentQuery.create({ data: q }).catch(() => {});
  }

  // ── 12. Compliance Items ───────────────────────────────────────────────────
  console.log('  → Compliance Items');
  const complianceItems = [
    { category: 'Safety',       title: 'Fire Safety Drill – Term 1',        description: 'Conduct a school-wide fire safety drill.',                         status: 'completed',    dueDate: new Date('2025-05-30'), notes: 'Drill conducted on 28 May. All students evacuated in 4 mins 32 secs.', assignedTo: 'Mr. Rajan (Safety Officer)' },
    { category: 'Safety',       title: 'CCTV System Annual Maintenance',     description: 'Annual check and maintenance of all CCTV cameras.',               status: 'completed',    dueDate: new Date('2025-06-15'), notes: 'Completed by TechSecure on 12 June 2025.', assignedTo: 'School Admin' },
    { category: 'Regulatory',   title: 'CBSE Affiliation Renewal 2026-27',   description: 'Submit renewal documents to CBSE for 2026-27 academic year.',     status: 'in_progress',  dueDate: daysAhead(30), notes: 'Documents being compiled. Affiliation no: 2730015.', assignedTo: 'Principal' },
    { category: 'Regulatory',   title: 'Building Safety Certificate',        description: 'Annual structural safety certificate from municipal authorities.', status: 'overdue',      dueDate: daysAgo(10), notes: 'Inspector appointment pending. Follow up with BBMP.', assignedTo: 'Admin Officer' },
    { category: 'Health',       title: 'Medical Room Stock Check',           description: 'Quarterly audit of first-aid supplies and medicines.',             status: 'pending',      dueDate: daysAhead(15), notes: null, assignedTo: 'School Nurse' },
    { category: 'HR',           title: 'Staff Police Verification – New Joiners', description: 'Submit police verification forms for 3 new staff members.', status: 'pending',     dueDate: daysAhead(7),  notes: null, assignedTo: 'HR Officer' },
    { category: 'Infrastructure', title: 'Annual Electrical Audit',          description: 'Electrical wiring and switchboard safety audit by certified engineer.', status: 'completed', dueDate: new Date('2025-07-31'), notes: 'Audit completed. 2 minor issues fixed.', assignedTo: 'Maintenance Head' },
  ];
  for (const c of complianceItems) {
    await prisma.complianceItem.create({
      data: { schoolId: IDs.schools.dps, ...c },
    }).catch(() => {});
  }

  // ── 13. Fee Payments ──────────────────────────────────────────────────────────
  console.log('  → Fee Payments');
  const paidInvoices = await prisma.feeInvoice.findMany({ where: { schoolId: IDs.schools.dps, status: 'paid' } });
  for (const inv of paidInvoices) {
    await prisma.feePayment.create({
      data: { invoiceId: inv.id, amount: inv.paidAmount, paymentMethod: 'upi', transactionRef: `TXN${Date.now()}${Math.random().toString(36).slice(2,6).toUpperCase()}`, paymentGateway: 'razorpay', status: 'success', paidAt: daysAgo(5) },
    }).catch(() => {});
  }

  // ── 14. Homework Submissions ───────────────────────────────────────────────
  console.log('  → Homework Submissions');
  const allHomework = await prisma.homework.findMany({ where: { schoolId: IDs.schools.dps, classId: IDs.classes.dps5A } });
  const submitters = [IDs.students.aarav, IDs.students.ananya, IDs.students.kavya];
  for (const hw of allHomework) {
    for (const studentId of submitters) {
      await prisma.homeworkSubmission.upsert({
        where: { homeworkId_studentId: { homeworkId: hw.id, studentId } },
        update: {},
        create: { homeworkId: hw.id, studentId, submittedAt: daysAgo(1), status: 'submitted', marksObtained: Math.floor(Math.random() * 5) + 6, feedback: 'Good effort!' },
      });
    }
  }

  // ── 15. Transport Buses & Rides ────────────────────────────────────────────
  console.log('  → Transport Buses & Rides');
  const bus1Id = 'bus00001-0000-0000-0000-000000000001';
  const bus2Id = 'bus00001-0000-0000-0000-000000000002';
  await prisma.transportBus.upsert({ where: { id: bus1Id }, update: {}, create: { id: bus1Id, schoolId: IDs.schools.dps, busNumber: 'DL-01-AB-1234', capacity: 40, gpsEnabled: true, gpsDeviceId: 'GPS-001', isActive: true } });
  await prisma.transportBus.upsert({ where: { id: bus2Id }, update: {}, create: { id: bus2Id, schoolId: IDs.schools.dps, busNumber: 'DL-01-CD-5678', capacity: 35, gpsEnabled: false, isActive: true } });

  const route1 = await prisma.transportRoute.findFirst({ where: { schoolId: IDs.schools.dps, name: 'Sector 45-56 Route' } });
  if (route1) {
    const ride1Id = 'ride0001-0000-0000-0000-000000000001';
    await prisma.transportRide.upsert({
      where: { id: ride1Id },
      update: {},
      create: { id: ride1Id, schoolId: IDs.schools.dps, routeId: route1.id, busId: bus1Id, employeeId: IDs.users.dpsAdmin, direction: 'morning', departureTime: new Date(now.setHours(7, 0, 0, 0)), arrivalTime: new Date(now.setHours(8, 10, 0, 0)), status: 'completed', gpsEnabled: true, gpsLat: 28.4595, gpsLng: 77.0266 },
    });
    for (const studentId of [IDs.students.aarav, IDs.students.ananya]) {
      await prisma.rideStudent.upsert({
        where: { rideId_studentId: { rideId: ride1Id, studentId } },
        update: {},
        create: { rideId: ride1Id, studentId, pickupStatus: 'picked_up', dropStatus: 'dropped' },
      });
    }
  }

  // ── 16. Admission Applications ────────────────────────────────────────────
  console.log('  → Admission Applications');
  const workflow = await prisma.admissionWorkflow.findFirst({ where: { schoolId: IDs.schools.dps, isActive: true } });
  const app1Id = 'app00001-0000-0000-0000-000000000001';
  const app2Id = 'app00001-0000-0000-0000-000000000002';
  const app3Id = 'app00001-0000-0000-0000-000000000003';

  await prisma.admissionApplication.upsert({ where: { id: app1Id }, update: {}, create: { id: app1Id, schoolId: IDs.schools.dps, workflowId: workflow?.id, parentName: 'Sanjay Kapoor', parentPhone: '+91-9876512345', parentEmail: 'sanjay.kapoor@gmail.com', currentStep: 2, status: 'submitted', riskScore: 0, submittedAt: daysAgo(5) } });
  await prisma.admissionApplication.upsert({ where: { id: app2Id }, update: {}, create: { id: app2Id, schoolId: IDs.schools.dps, workflowId: workflow?.id, parentName: 'Meena Joshi',   parentPhone: '+91-9123456789', parentEmail: 'meena.joshi@gmail.com',   currentStep: 4, status: 'approved', riskScore: 0, submittedAt: daysAgo(20) } });
  await prisma.admissionApplication.upsert({ where: { id: app3Id }, update: {}, create: { id: app3Id, schoolId: IDs.schools.dps, workflowId: workflow?.id, parentName: 'Anand Tiwari',  parentPhone: '+91-9988776655', parentEmail: 'anand.tiwari@gmail.com',  currentStep: 1, status: 'rejected', riskScore: 2, submittedAt: daysAgo(15) } });

  await prisma.admissionChild.create({ data: { applicationId: app1Id, firstName: 'Rohan',   lastName: 'Kapoor', dateOfBirth: new Date('2016-04-10'), gender: 'male',   classApplying: 'Grade 4', previousSchool: 'Sunrise Primary School' } }).catch(() => {});
  await prisma.admissionChild.create({ data: { applicationId: app2Id, firstName: 'Simran',  lastName: 'Joshi',  dateOfBirth: new Date('2015-09-22'), gender: 'female', classApplying: 'Grade 5', previousSchool: 'City Montessori School'  } }).catch(() => {});
  await prisma.admissionChild.create({ data: { applicationId: app3Id, firstName: 'Vikrant', lastName: 'Tiwari', dateOfBirth: new Date('2013-11-30'), gender: 'male',   classApplying: 'Grade 7', previousSchool: null                     } }).catch(() => {});

  await prisma.admissionAction.create({ data: { applicationId: app1Id, actorUserId: IDs.users.dpsAdmin,  stepOrder: 2, action: 'review',  comment: 'Documents received, verifying.' } }).catch(() => {});
  await prisma.admissionAction.create({ data: { applicationId: app2Id, actorUserId: IDs.users.dpsAdmin,  stepOrder: 4, action: 'approve', comment: 'All documents verified. Admission granted.' } }).catch(() => {});
  await prisma.admissionAction.create({ data: { applicationId: app3Id, actorUserId: IDs.users.dpsAdmin,  stepOrder: 1, action: 'reject',  comment: 'Seats not available in Grade 7 for the current year.' } }).catch(() => {});

  // ── 17. Letter Templates ───────────────────────────────────────────────────
  console.log('  → Letter Templates');
  const templates = [
    {
      name: 'Transfer Certificate',
      templateType: 'transfer_certificate',
      isDefault: true,
      htmlContent: `<div style="font-family: Times New Roman; padding: 40px; border: 2px solid #000;">
<h2 style="text-align:center">TRANSFER CERTIFICATE</h2>
<p>This is to certify that <strong>{{student_name}}</strong> (Admission No: {{admission_no}}),
son/daughter of {{parent_name}}, was a bonafide student of this school from
<strong>{{joining_date}}</strong> to <strong>{{leaving_date}}</strong>.</p>
<p>The student was studying in <strong>{{class_name}}</strong> at the time of leaving.</p>
<p>Conduct: Good &nbsp;&nbsp; Attendance: {{attendance_percent}}%</p>
<br/><p>Date: {{today_date}}</p>
<p style="margin-top: 60px">Principal's Signature</p></div>`,
    },
    {
      name: 'Bonafide Certificate',
      templateType: 'bonafide',
      isDefault: true,
      htmlContent: `<div style="font-family: Arial; padding: 40px; border: 1px solid #333;">
<h2 style="text-align:center">BONAFIDE CERTIFICATE</h2>
<p>This is to certify that <strong>{{student_name}}</strong>, studying in Class <strong>{{class_name}}</strong>
(Academic Year {{academic_year}}), is a bonafide student of our institution.</p>
<p>This certificate is issued on request for the purpose of <em>{{purpose}}</em>.</p>
<br/><p>Date: {{today_date}}</p>
<p style="margin-top: 60px">School Seal &nbsp;&nbsp;&nbsp; Principal's Signature</p></div>`,
    },
    {
      name: 'Fee Receipt',
      templateType: 'fee_receipt',
      isDefault: true,
      htmlContent: `<div style="font-family: Arial; padding: 30px;">
<h3 style="text-align:center">FEE RECEIPT</h3>
<table style="width:100%; border-collapse: collapse;">
<tr><td>Receipt No:</td><td><strong>{{invoice_no}}</strong></td></tr>
<tr><td>Student Name:</td><td><strong>{{student_name}}</strong></td></tr>
<tr><td>Class:</td><td>{{class_name}}</td></tr>
<tr><td>Amount Paid:</td><td><strong>₹{{amount}}</strong></td></tr>
<tr><td>Payment Date:</td><td>{{paid_at}}</td></tr>
<tr><td>Payment Mode:</td><td>{{payment_method}}</td></tr>
</table>
<p style="margin-top: 40px; text-align: right">Authorised Signatory</p></div>`,
    },
  ];
  for (const t of templates) {
    await prisma.letterTemplate.create({
      data: { schoolId: IDs.schools.dps, ...t, isActive: true },
    }).catch(() => {});
  }

  // ── 18. School Inventory ──────────────────────────────────────────────────
  console.log('  → School Inventory');
  const invItems = [
    { name: 'Whiteboard Markers (Box of 10)', category: 'stationery', unit: 'box',   minStock: 20, description: 'Dry-erase whiteboard markers, assorted colours' },
    { name: 'A4 Paper Ream',                  category: 'stationery', unit: 'ream',  minStock: 50, description: '75 GSM A4 printing paper, 500 sheets per ream'   },
    { name: 'Classroom Duster',               category: 'equipment',  unit: 'piece', minStock: 30, description: 'Felt board duster for whiteboard / blackboard'    },
    { name: 'Sports Ball (Football)',          category: 'sports',     unit: 'piece', minStock: 5,  description: 'Size 5 rubber football for PT use'               },
    { name: 'First Aid Kit',                  category: 'health',     unit: 'kit',   minStock: 3,  description: 'Standard first-aid kit with bandages, antiseptic' },
    { name: 'Printer Ink Cartridge (Black)',  category: 'equipment',  unit: 'piece', minStock: 5,  description: 'Compatible black ink cartridge for HP DeskJet'    },
  ];
  for (const item of invItems) {
    const inv = await prisma.inventoryItem.create({
      data: { schoolId: IDs.schools.dps, ...item },
    }).catch(() => null);
    if (inv) {
      await prisma.inventoryStock.create({ data: { itemId: inv.id, quantity: Math.floor(Math.random() * 80) + 10, location: 'Store Room A' } }).catch(() => {});
      await prisma.inventoryPurchase.create({ data: { itemId: inv.id, vendorName: 'Delhi Office Supplies', quantity: 100, unitPrice: 50, totalAmount: 5000, purchaseDate: daysAgo(30), invoiceNo: `PO-2025-${Math.floor(Math.random()*1000)}` } }).catch(() => {});
    }
  }

  // ── 19. Session Bookings (Career Sessions) ────────────────────────────────
  console.log('  → Session Bookings');
  const sessions = await prisma.consultantSession.findMany({ where: { consultantId: IDs.consultants.meera, schoolId: IDs.schools.dps } });
  // Consultant Availability (must be created before bookings)
  console.log('  → Consultant Availability');
  const availIds: string[] = [];
  for (const dayOfWeek of [1, 3, 5]) {
    const avail = await prisma.consultantAvailability.create({
      data: { consultantId: IDs.consultants.meera, dayOfWeek, startTime: '15:00', endTime: '18:00', maxBookings: 4, isActive: true },
    }).catch(() => null);
    if (avail) availIds.push(avail.id);
  }

  if (sessions.length > 0 && availIds.length > 0) {
    const bookings = [
      { parentId: IDs.parents.vikram, studentId: IDs.students.aarav,  status: 'confirmed' },
      { parentId: IDs.parents.neha,   studentId: IDs.students.ishaan, status: 'confirmed' },
      { parentId: IDs.parents.vikram, studentId: IDs.students.ananya, status: 'pending'   },
    ];
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      await prisma.sessionBooking.create({
        data: { consultantId: IDs.consultants.meera, availabilityId: availIds[0], schoolId: IDs.schools.dps, parentId: b.parentId, studentId: b.studentId, sessionDate: daysAhead(3 + i * 2), startTime: '15:00', endTime: '15:30', mode: 'online', status: b.status, paymentStatus: 'free' },
      }).catch(() => {});
    }
  }

  // ── 20. Vendor Products & Orders ─────────────────────────────────────────
  console.log('  → Vendor Products & Orders');
  const product1Id = 'vp000001-0000-0000-0000-000000000001';
  const product2Id = 'vp000001-0000-0000-0000-000000000002';
  await prisma.vendorProduct.upsert({ where: { id: product1Id }, update: {}, create: { id: product1Id, vendorId: IDs.vendor, name: 'DPS School Bag (Grade 5)', description: 'Official school bag, ergonomic design with padded back support.', category: 'bags', price: 799, quantity: 150, unit: 'piece', isActive: true, tags: ['bag', 'school'], imageUrls: [] } });
  await prisma.vendorProduct.upsert({ where: { id: product2Id }, update: {}, create: { id: product2Id, vendorId: IDs.vendor, name: 'Complete Stationery Set',   description: '12 pencils, 2 pens, eraser, sharpener, ruler in a zipper case.', category: 'stationery', price: 249, quantity: 300, unit: 'set', isActive: true, tags: ['stationery'], imageUrls: [] } });

  const order1Id = 'vo000001-0000-0000-0000-000000000001';
  const order2Id = 'vo000001-0000-0000-0000-000000000002';
  await prisma.vendorOrder.upsert({ where: { orderNo: 'ORD-2025-0001' }, update: {}, create: { id: order1Id, vendorId: IDs.vendor, parentId: IDs.parents.vikram, orderNo: 'ORD-2025-0001', totalAmount: 1048, status: 'delivered', paymentStatus: 'paid' } });
  await prisma.vendorOrder.upsert({ where: { orderNo: 'ORD-2025-0002' }, update: {}, create: { id: order2Id, vendorId: IDs.vendor, parentId: IDs.parents.neha,   orderNo: 'ORD-2025-0002', totalAmount: 498,  status: 'processing', paymentStatus: 'paid' } });

  await prisma.vendorOrderItem.create({ data: { orderId: order1Id, productId: product1Id, quantity: 1, unitPrice: 799, total: 799 } }).catch(() => {});
  await prisma.vendorOrderItem.create({ data: { orderId: order1Id, productId: product2Id, quantity: 1, unitPrice: 249, total: 249 } }).catch(() => {});
  await prisma.vendorOrderItem.create({ data: { orderId: order2Id, productId: product2Id, quantity: 2, unitPrice: 249, total: 498 } }).catch(() => {});

  // Vendor Rating (linked to order)
  console.log('  → Ratings');
  await prisma.vendorRating.create({ data: { vendorId: IDs.vendor, parentId: IDs.parents.vikram, orderId: order1Id, rating: 5, review: 'Great quality! The school bag is sturdy and kids love it.' } }).catch(() => {});

  // ── 21. Grade Masters ─────────────────────────────────────────────────────
  console.log('  → Grade Masters');
  const grades = [
    { name: 'Grade 1', sortOrder: 1 },  { name: 'Grade 2', sortOrder: 2 },
    { name: 'Grade 3', sortOrder: 3 },  { name: 'Grade 4', sortOrder: 4 },
    { name: 'Grade 5', sortOrder: 5 },  { name: 'Grade 6', sortOrder: 6 },
    { name: 'Grade 7', sortOrder: 7 },  { name: 'Grade 8', sortOrder: 8 },
    { name: 'Grade 9', sortOrder: 9 },  { name: 'Grade 10', sortOrder: 10 },
    { name: 'Grade 11', sortOrder: 11 }, { name: 'Grade 12', sortOrder: 12 },
  ];
  for (const g of grades) {
    await prisma.gradeMaster.upsert({
      where: { schoolId_name: { schoolId: IDs.schools.dps, name: g.name } },
      update: {},
      create: { schoolId: IDs.schools.dps, ...g },
    });
  }

  console.log('\n✅  All demo data added successfully!');
  console.log('   Modules seeded: Timetable · Syllabus · Exams+Results · Events · Online Classes');
  console.log('   Courses · Leave Requests · Queries · Compliance · Holiday Calendar');
  console.log('   Letter Templates · Fee Payments · Homework Submissions · Transport');
  console.log('   Admission Applications · Inventory · Session Bookings · Vendor Orders\n');
}

seed()
  .catch((e) => { console.error('❌  Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
