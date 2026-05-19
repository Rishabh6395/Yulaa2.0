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
  console.log(`  ${pass ? 'OK' : 'FAIL'} [${status}] ${label}${pass ? '' : ' => ' + JSON.stringify(data).substring(0, 200)}`);
}

async function main() {
  const admToken = await login('admin@dps45.edu.in');

  const classRes = (await api('GET', '/api/classes', undefined, admToken)).data;
  const classes = classRes.classes ?? [];
  const classId = classes[0]?.id;
  const teacherRes = (await api('GET', '/api/teachers', undefined, admToken)).data;
  const teacherId = teacherRes.teachers?.[0]?.id;
  
  console.log(`classId: ${classId}, teacherId: ${teacherId}`);

  // Timetable
  console.log('\n[TIMETABLE]');
  if (classId && teacherId) {
    console.log('  Generating...');
    const r = await api('POST', '/api/timetable/generate', {
      classId, periodsPerDay: 5, workingDays: [1,2,3,4,5],
      subjects: [
        { subject: 'Math', teacherId, periodsPerWeek: 5 },
        { subject: 'Science', teacherId, periodsPerWeek: 5 },
        { subject: 'English', teacherId, periodsPerWeek: 5 },
        { subject: 'Hindi', teacherId, periodsPerWeek: 5 },
        { subject: 'Social', teacherId, periodsPerWeek: 5 },
      ]
    }, admToken);
    ok('Generate timetable', r.status, r.data);
    console.log(`  slotsGenerated: ${r.data.slotsGenerated}`);
  }

  // ID card
  console.log('\n[ID CARD]');
  if (classId) {
    const r = await api('GET', `/api/students/id-card?class_id=${classId}`, undefined, admToken);
    ok('Bulk ID card', r.status, r.data);
    console.log(`  cards: ${r.data.cards?.length ?? 'undefined'}, students: ${r.data.students?.length ?? 'undefined'}`);
  }
}
main().catch(e => { console.error('FATAL:', e.message); });
