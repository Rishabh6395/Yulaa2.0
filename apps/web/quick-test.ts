const BASE = 'http://localhost:3000';
async function api(method: string, path: string, body?: any, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({ _raw: res.status })) };
}
async function login(email: string) {
  const r = await api('POST', '/api/auth/login', { email, password: 'Test@1234' });
  if (r.data.token) return r.data.token as string;
  throw new Error(`Login failed for ${email}: ${JSON.stringify(r.data)}`);
}
function ok(label: string, status: number, data: any) {
  const pass = status >= 200 && status < 300;
  console.log(`  ${pass ? 'OK' : 'FAIL'} [${status}] ${label}${pass ? '' : ' => ' + JSON.stringify(data).substring(0, 150)}`);
}

async function main() {
  const admToken = await login('admin@dps45.edu.in');

  // Get IDs
  const students = (await api('GET', '/api/students', undefined, admToken)).data.students ?? [];
  const teachers = (await api('GET', '/api/teachers', undefined, admToken)).data.teachers ?? [];
  const studentId = students[0]?.id;
  const teacherId = teachers[0]?.id;
  console.log(`Using studentId: ${studentId}, teacherId: ${teacherId}`);

  // Bug 1: Subject chat — cycleId null upsert fix
  console.log('\n[SUBJECT CHAT FIX]');
  let r = await api('POST', '/api/performance/subject-chat', {
    studentId, teacherId, subject: 'Mathematics',
    message: 'First message in thread.',
  }, admToken);
  ok('Create thread (no cycleId)', r.status, r.data);
  const threadId = r.data.thread?.id;
  console.log(`  threadId: ${threadId}`);

  if (threadId) {
    r = await api('POST', '/api/performance/subject-chat', {
      studentId, teacherId, subject: 'Mathematics',
      message: 'Second message — should reuse same thread.',
    }, admToken);
    ok('Send to existing thread (idempotent)', r.status, r.data);
    console.log(`  Same thread? ${r.data.thread?.id === threadId}`);

    r = await api('PATCH', `/api/performance/subject-chat?thread_id=${threadId}`, { action: 'mark_read' }, admToken);
    ok('Mark read', r.status, r.data);
    r = await api('PATCH', `/api/performance/subject-chat?thread_id=${threadId}`, { action: 'resolve' }, admToken);
    ok('Resolve thread', r.status, r.data);
  }

  // Bug 2: Timetable timeout fix
  console.log('\n[TIMETABLE FIX]');
  const classId = students[0]?.classId;
  if (classId && teacherId) {
    r = await api('POST', '/api/timetable/generate', {
      classId, periodsPerDay: 6, workingDays: [1,2,3,4,5],
      subjects: [
        { subject: 'Mathematics', teacherId, periodsPerWeek: 6 },
        { subject: 'Science', teacherId, periodsPerWeek: 5 },
        { subject: 'English', teacherId, periodsPerWeek: 5 },
        { subject: 'Hindi', teacherId, periodsPerWeek: 5 },
        { subject: 'Social', teacherId, periodsPerWeek: 5 },
        { subject: 'Computer', teacherId, periodsPerWeek: 4 },
      ]
    }, admToken);
    ok('Generate timetable (batched)', r.status, r.data);
    console.log(`  slotsGenerated: ${r.data.slotsGenerated}`);
  }

  // Bug 3: Payroll skipped count
  console.log('\n[PAYROLL FIX]');
  if (teacherId) {
    const now = new Date();
    r = await api('POST', '/api/hrms/payroll', { month: now.getMonth() + 1, year: now.getFullYear() }, admToken);
    ok('Payroll (should skip — already exists)', r.status, r.data);
    console.log(`  generated: ${r.data.generated}, skipped: ${r.data.skipped}`);
  }

  // Bug 4: ID card returns `cards` not `students`
  console.log('\n[ID CARD FIX]');
  if (classId) {
    r = await api('GET', `/api/students/id-card?class_id=${classId}`, undefined, admToken);
    ok('Bulk ID card (key=cards)', r.status, r.data);
    console.log(`  cards: ${r.data.cards?.length} (students key: ${r.data.students?.length})`);
  }
}
main().catch(console.error);
