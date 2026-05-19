import prisma from './src/lib/prisma';

const BASE = 'http://localhost:3000';

async function api(method: string, path: string, body?: any, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ _raw: res.status }));
  return { status: res.status, data: json };
}

async function login(email: string, password = 'Test@1234') {
  const r = await api('POST', '/api/auth/login', { email, password });
  if (r.data.token) return r.data.token as string;
  throw new Error(`Login failed for ${email}: ${JSON.stringify(r.data)}`);
}

function ok(label: string, status: number, data: any) {
  const pass = status >= 200 && status < 300;
  console.log(`  ${pass ? 'OK' : 'FAIL'} [${status}] ${label}${pass ? '' : ' => ' + JSON.stringify(data).substring(0, 120)}`);
  return pass;
}

async function main() {
  console.log('\n====== ROLE-BASED API TEST REPORT ======\n');

  // SUPER ADMIN
  console.log('[SUPER ADMIN] superadmin@yulaa.ai');
  const saToken = await login('superadmin@yulaa.ai');

  let r = await api('GET', '/api/super-admin/schools', undefined, saToken);
  ok('List all schools', r.status, r.data);
  const schools = r.data.schools ?? [];
  const schoolId = schools[0]?.id;
  console.log(`   Found ${schools.length} schools. Using: ${schools[0]?.name}`);

  r = await api('GET', `/api/super-admin/schools/${schoolId}`, undefined, saToken);
  ok('Get single school detail', r.status, r.data);

  r = await api('GET', '/api/super-admin/users?role=teacher', undefined, saToken);
  ok('List users by role (super admin)', r.status, r.data);

  r = await api('GET', '/api/super-admin/academic-years?school_id=' + schoolId, undefined, saToken);
  ok('List academic years', r.status, r.data);

  r = await api('GET', '/api/dashboard?school_id=' + schoolId, undefined, saToken);
  ok('Dashboard (super admin)', r.status, r.data);

  // SCHOOL ADMIN
  console.log('\n[SCHOOL ADMIN] admin@dps45.edu.in');
  const admToken = await login('admin@dps45.edu.in');

  r = await api('GET', '/api/dashboard', undefined, admToken);
  ok('Dashboard (school admin)', r.status, r.data);

  r = await api('GET', '/api/classes', undefined, admToken);
  ok('List classes', r.status, r.data);
  const classes = r.data.classes ?? [];
  const classId = classes[0]?.id;
  console.log(`   Found ${classes.length} classes. Using classId: ${classId}`);

  r = await api('GET', '/api/students', undefined, admToken);
  ok('List students', r.status, r.data);
  const students = r.data.students ?? [];
  const studentId = students[0]?.id;
  console.log(`   Found ${students.length} students. Using studentId: ${studentId}`);

  r = await api('GET', '/api/teachers', undefined, admToken);
  ok('List teachers', r.status, r.data);
  const teachers = r.data.teachers ?? [];
  const teacherId = teachers[0]?.id;
  console.log(`   Found ${teachers.length} teachers. Using teacherId: ${teacherId}`);

  r = await api('GET', '/api/fees/invoices', undefined, admToken);
  ok('List fee invoices', r.status, r.data);

  r = await api('GET', '/api/fees/structures', undefined, admToken);
  ok('List fee structures', r.status, r.data);

  r = await api('GET', '/api/exams', undefined, admToken);
  ok('List exams', r.status, r.data);

  r = await api('GET', '/api/performance/cycles', undefined, admToken);
  ok('List performance cycles', r.status, r.data);
  const cycleId = r.data.cycles?.[0]?.id;
  console.log(`   cycleId: ${cycleId}`);

  r = await api('GET', '/api/announcements', undefined, admToken);
  ok('List announcements', r.status, r.data);

  r = await api('GET', '/api/admissions', undefined, admToken);
  ok('List admissions', r.status, r.data);

  // TIMETABLE GENERATE
  console.log('\n[TIMETABLE GENERATE]');
  if (classId && teacherId) {
    r = await api('POST', '/api/timetable/generate', {
      classId,
      periodsPerDay: 6,
      workingDays: [1,2,3,4,5],
      subjects: [
        { subject: 'Mathematics', teacherId, periodsPerWeek: 5 },
        { subject: 'Science', teacherId, periodsPerWeek: 4 },
        { subject: 'English', teacherId, periodsPerWeek: 3 },
        { subject: 'Hindi', teacherId, periodsPerWeek: 3 },
        { subject: 'Social Studies', teacherId, periodsPerWeek: 3 },
        { subject: 'Computer', teacherId, periodsPerWeek: 2 },
      ]
    }, admToken);
    ok('Generate timetable', r.status, r.data);
    console.log(`   slotsGenerated: ${r.data.slotsGenerated}`);
  }

  // REPORT CARD GENERATE
  console.log('\n[REPORT CARD GENERATE]');
  if (cycleId) {
    r = await api('POST', '/api/report-cards/generate', { cycleId, regenerate: false }, admToken);
    ok('Generate report cards', r.status, r.data);
    console.log(`   created: ${r.data.created}, updated: ${r.data.updated}, skipped: ${r.data.skipped}`);
  } else {
    console.log('  SKIP: No cycle found');
  }

  // LIBRARY
  console.log('\n[LIBRARY]');
  r = await api('POST', '/api/library/books', {
    isbn: '978-0-13-TEST-001',
    title: 'Clean Code Test',
    author: 'Robert C. Martin',
    totalCopies: 3
  }, admToken);
  ok('Add library book', r.status, r.data);
  const bookId = r.data.book?.id;

  r = await api('GET', '/api/library/books', undefined, admToken);
  ok('List library books', r.status, r.data);
  console.log(`   Books: ${r.data.books?.length}`);

  let issueId: string | undefined;
  if (bookId && studentId) {
    r = await api('POST', '/api/library/issues', {
      bookId, studentId, issueDate: new Date().toISOString().split('T')[0], loanDays: 14
    }, admToken);
    ok('Issue book to student', r.status, r.data);
    issueId = r.data.issue?.id;

    r = await api('GET', '/api/library/issues', undefined, admToken);
    ok('List active issues', r.status, r.data);

    if (issueId) {
      r = await api('PATCH', `/api/library/issues?id=${issueId}`, { action: 'return' }, admToken);
      ok('Return book', r.status, r.data);
    }
  }

  // HOSTEL
  console.log('\n[HOSTEL]');
  r = await api('POST', '/api/hostel/blocks', { name: 'Test Block A', gender: 'boys' }, admToken);
  ok('Create hostel block', r.status, r.data);
  const blockId = r.data.block?.id;

  if (blockId) {
    r = await api('POST', '/api/hostel/rooms', { blockId, roomNo: 'T101', capacity: 4, roomType: 'shared' }, admToken);
    ok('Create hostel room', r.status, r.data);
    const roomId = r.data.room?.id;

    r = await api('GET', '/api/hostel/rooms?vacant=true', undefined, admToken);
    ok('List vacant rooms', r.status, r.data);
    console.log(`   Vacant rooms: ${r.data.rooms?.length}`);

    if (roomId && studentId) {
      r = await api('POST', '/api/hostel/allocations', {
        studentId, roomId, academicYear: '2024-25', joinDate: new Date().toISOString().split('T')[0]
      }, admToken);
      ok('Allocate student to room', r.status, r.data);
    }
  }

  // DIARY
  console.log('\n[DIARY]');
  if (classId && teacherId) {
    r = await api('POST', '/api/diary', {
      classId, teacherId,
      date: new Date().toISOString().split('T')[0],
      subject: 'Mathematics',
      content: 'Today we covered quadratic equations.',
      homeworkDetails: 'Complete exercise 5.3, questions 1-10',
    }, admToken);
    ok('Create diary entry', r.status, r.data);

    r = await api('GET', `/api/diary?classId=${classId}`, undefined, admToken);
    ok('List diary entries for class', r.status, r.data);
    console.log(`   Diary entries: ${r.data.entries?.length}`);
  }

  // HRMS
  console.log('\n[HRMS]');
  if (teacherId) {
    r = await api('POST', '/api/hrms/salary-config', {
      teacherId, basic: 35000, hra: 8750, pfPercent: 12,
      effectiveFrom: '2024-04-01'
    }, admToken);
    ok('Set salary config for teacher', r.status, r.data);

    const now = new Date();
    r = await api('POST', '/api/hrms/payroll', {
      month: now.getMonth() + 1, year: now.getFullYear()
    }, admToken);
    ok('Generate payroll for current month', r.status, r.data);
    console.log(`   Generated: ${r.data.generated}, Skipped: ${r.data.skipped}`);

    // Run again - should skip all
    r = await api('POST', '/api/hrms/payroll', {
      month: now.getMonth() + 1, year: now.getFullYear()
    }, admToken);
    ok('Re-generate payroll (should skip existing)', r.status, r.data);
    console.log(`   Generated: ${r.data.generated}, Skipped: ${r.data.skipped}`);
  }

  // STUDENT ID CARD
  console.log('\n[STUDENT ID CARD]');
  if (studentId) {
    r = await api('GET', `/api/students/id-card?student_id=${studentId}`, undefined, admToken);
    ok('Get student ID card data', r.status, r.data);
  }
  if (classId) {
    r = await api('GET', `/api/students/id-card?class_id=${classId}`, undefined, admToken);
    ok('Bulk ID card data by class', r.status, r.data);
    console.log(`   ID cards: ${r.data.students?.length} students`);
  }

  // PERFORMANCE ANALYTICS
  console.log('\n[PERFORMANCE]');
  if (studentId && cycleId) {
    r = await api('GET', `/api/performance/peer-comparison?student_id=${studentId}&cycle_id=${cycleId}`, undefined, admToken);
    ok('Peer comparison / percentile', r.status, r.data);
  } else {
    console.log('  SKIP: No student+cycle for peer comparison');
  }

  r = await api('POST', '/api/performance/risk-flags', {}, admToken);
  ok('Compute risk flags (school-wide)', r.status, r.data);
  console.log(`   Evaluated: ${r.data.evaluated}, Flagged: ${r.data.flagged}`);

  r = await api('GET', '/api/performance/risk-flags', undefined, admToken);
  ok('List risk flags', r.status, r.data);
  console.log(`   Total flags: ${r.data.flags?.length}`);

  // BOARD EXAM TRACKER
  console.log('\n[BOARD EXAM TRACKER]');
  if (studentId) {
    r = await api('POST', '/api/board-exam-tracker', {
      studentId, subject: 'Mathematics', boardExamType: 'class10',
      syllabusCoverage: 65, targetScore: 90,
      weakTopics: ['Integration', 'Probability'],
      strongTopics: ['Algebra', 'Trigonometry'],
    }, admToken);
    ok('Create board exam tracker', r.status, r.data);

    r = await api('GET', `/api/board-exam-tracker?student_id=${studentId}`, undefined, admToken);
    ok('List board exam trackers', r.status, r.data);
    console.log(`   Trackers: ${r.data.trackers?.length}`);
  }

  // SUBJECT CHAT
  console.log('\n[SUBJECT CHAT]');
  if (studentId && teacherId) {
    r = await api('POST', '/api/performance/subject-chat', {
      studentId, teacherId, subject: 'Mathematics',
      message: 'Rahul has been struggling with integration. Please schedule extra practice.',
    }, admToken);
    ok('Create subject chat thread', r.status, r.data);
    const threadId = r.data.thread?.id;

    r = await api('GET', `/api/performance/subject-chat?student_id=${studentId}`, undefined, admToken);
    ok('List subject chat threads', r.status, r.data);
    console.log(`   Threads: ${r.data.threads?.length}`);

    if (threadId) {
      // Send another message
      r = await api('POST', '/api/performance/subject-chat', {
        threadId, message: 'Acknowledged. Will schedule extra class on Friday.'
      }, admToken);
      ok('Reply to thread', r.status, r.data);

      r = await api('PATCH', `/api/performance/subject-chat?thread_id=${threadId}`, { action: 'mark_read' }, admToken);
      ok('Mark thread as read', r.status, r.data);

      r = await api('PATCH', `/api/performance/subject-chat?thread_id=${threadId}`, { action: 'resolve' }, admToken);
      ok('Resolve thread', r.status, r.data);
    }
  }

  // TEACHER ROLE
  console.log('\n[TEACHER] priya.teacher@dps45.edu.in');
  const tchToken = await login('priya.teacher@dps45.edu.in');

  r = await api('GET', '/api/dashboard', undefined, tchToken);
  ok('Dashboard (teacher)', r.status, r.data);

  r = await api('GET', '/api/attendance', undefined, tchToken);
  ok('List attendance (teacher)', r.status, r.data);

  r = await api('GET', '/api/exams', undefined, tchToken);
  ok('List exams (teacher)', r.status, r.data);

  // Teacher trying to access super-admin route — must be blocked
  r = await api('GET', '/api/super-admin/schools', undefined, tchToken);
  const teacherBlocked = r.status === 401 || r.status === 403;
  ok('Block teacher from super-admin [security]', teacherBlocked ? 200 : 500, `Expected 401/403, got ${r.status}`);
  if (!teacherBlocked) console.log('  SECURITY BUG: teacher can access /api/super-admin/schools');

  // Teacher trying to generate payroll — should be blocked
  r = await api('POST', '/api/hrms/payroll', { month: 5, year: 2025 }, tchToken);
  const payrollBlocked = r.status === 401 || r.status === 403;
  ok('Block teacher from payroll generation [security]', payrollBlocked ? 200 : 500, `Expected 401/403, got ${r.status}`);

  // PARENT ROLE
  console.log('\n[PARENT] parent.singh@gmail.com');
  const parToken = await login('parent.singh@gmail.com');

  r = await api('GET', '/api/dashboard', undefined, parToken);
  ok('Dashboard (parent)', r.status, r.data);

  r = await api('GET', '/api/attendance', undefined, parToken);
  ok('View attendance (parent sees own child)', r.status, r.data);

  r = await api('GET', '/api/fees/invoices', undefined, parToken);
  ok('View fee invoices (parent)', r.status, r.data);

  r = await api('GET', '/api/performance/risk-flags', undefined, parToken);
  const parentRiskBlocked = r.status === 401 || r.status === 403;
  ok('Block parent from risk flags [security]', parentRiskBlocked ? 200 : 500, `Expected 401/403, got ${r.status}`);
  if (!parentRiskBlocked) console.log('  SECURITY BUG: parent can access risk flags');

  r = await api('GET', '/api/performance/subject-chat', undefined, parToken);
  ok('Parent views subject chat (own child)', r.status, r.data);

  // CROSS-SCHOOL ISOLATION
  console.log('\n[CROSS-SCHOOL ISOLATION]');
  const stmarysToken = await login('admin@stmarys.edu.in');
  if (studentId) {
    r = await api('GET', `/api/students/${studentId}`, undefined, stmarysToken);
    const isolated = r.status === 404 || r.status === 403;
    ok(`St Marys admin cannot read DPS student`, isolated ? 200 : 500, `Got ${r.status}, expected 403/404`);
    if (!isolated) console.log('  CRITICAL BUG: cross-school data leak!');
  }

  // EDGE CASES
  console.log('\n[EDGE CASES]');

  // Issue non-existent book
  r = await api('POST', '/api/library/issues', { bookId: '00000000-0000-0000-0000-000000000000', studentId, issueDate: '2024-01-01' }, admToken);
  ok('Issue non-existent book (expect 404)', r.status === 404 ? 200 : 500, `Got ${r.status}`);

  // Board exam with invalid type
  if (studentId) {
    r = await api('POST', '/api/board-exam-tracker', {
      studentId, subject: 'Maths', boardExamType: 'invalid_type'
    }, admToken);
    ok('Invalid boardExamType rejected (expect 4xx)', r.status >= 400 ? 200 : 500, `Got ${r.status}`);
  }

  // Upsert same board exam tracker (idempotent)
  if (studentId) {
    r = await api('POST', '/api/board-exam-tracker', {
      studentId, subject: 'Mathematics', boardExamType: 'class10',
      syllabusCoverage: 80, targetScore: 95,
    }, admToken);
    ok('Upsert board exam tracker (idempotent)', r.status, r.data);
    console.log(`   New coverage: ${r.data.tracker?.syllabusCoverage}%`);
  }

  console.log('\n====== TEST COMPLETE ======\n');
  await prisma.$disconnect();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
