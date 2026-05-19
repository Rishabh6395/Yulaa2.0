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
  return pass;
}

async function main() {
  const saToken  = await login('superadmin@yulaa.ai');
  const admToken = await login('admin@dps45.edu.in');
  const tchToken = await login('priya.teacher@dps45.edu.in');

  const schools  = (await api('GET', '/api/super-admin/schools', undefined, saToken)).data.schools ?? [];
  const schoolId = schools[0]?.id;
  console.log(`School: ${schools[0]?.name} (${schoolId})`);

  console.log('\n[SECURITY: DATA BREACH FIX]');
  let r = await api('GET', '/api/performance/compute?cycle_id=fake', undefined, saToken);
  ok('SA compute without school_id (expect 400)', r.status === 400 ? 200 : 500, `Got ${r.status}: ${JSON.stringify(r.data).substring(0,80)}`);

  console.log('\n[SUPER ADMIN PERFORMANCE CONFIG]');
  r = await api('GET', `/api/super-admin/performance-config?school_id=${schoolId}`, undefined, saToken);
  ok('Get full performance config', r.status, r.data);
  if (r.status === 200) {
    console.log(`  KPIs: ${r.data.kpiConfig?.length ?? 0}, RatingConfigs: ${r.data.ratingConfig?.length ?? 0}`);
    console.log(`  RiskConfigs: ${r.data.riskConfig?.length ?? 0}, Behavior: ${r.data.behaviorConfig?.length ?? 0}`);
    console.log(`  Grading bands: ${r.data.gradingScheme?.length ?? 0}, Subjects: ${r.data.subjects?.length ?? 0}`);
    console.log(`  Templates: ${r.data.templates?.length ?? 0}`);
    console.log(`  CompositeWeights: ${JSON.stringify(r.data.compositeWeights)}`);
  }

  r = await api('GET', `/api/super-admin/performance-config?school_id=${schoolId}`, undefined, admToken);
  ok('Block school admin from SA performance config [security]', r.status === 403 ? 200 : 500, `Got ${r.status}`);

  console.log('\n[COMPOSITE WEIGHTS]');
  r = await api('PATCH', `/api/super-admin/performance-config?school_id=${schoolId}`, {
    weightAcademic: 50, weightAttendance: 25, weightBehavior: 15, weightEco: 10
  }, saToken);
  ok('Update composite weights (50+25+15+10=100)', r.status, r.data);

  r = await api('PATCH', `/api/super-admin/performance-config?school_id=${schoolId}`, {
    weightAcademic: 50, weightAttendance: 30, weightBehavior: 15, weightEco: 10
  }, saToken);
  ok('Reject bad weights (105, expect 400)', r.status === 400 ? 200 : 500, `Got ${r.status}`);

  console.log('\n[GRADING SCHEME]');
  r = await api('POST', '/api/super-admin/grading-scheme', {
    schoolId, gradeLevel: 'all', label: 'A+', minPct: 90, maxPct: 100, gpaPoints: 10.0, remark: 'Outstanding'
  }, saToken);
  ok('Create A+ band', r.status, r.data);

  r = await api('POST', '/api/super-admin/grading-scheme', {
    schoolId, gradeLevel: 'all', label: 'F', minPct: 0, maxPct: 32, gpaPoints: 0, remark: 'Fail'
  }, saToken);
  ok('Create F band', r.status, r.data);

  r = await api('GET', `/api/super-admin/grading-scheme?school_id=${schoolId}`, undefined, tchToken);
  ok('Teacher can READ grading scheme', r.status, r.data);

  r = await api('POST', '/api/super-admin/grading-scheme', {
    schoolId, gradeLevel: 'all', label: 'B', minPct: 70, maxPct: 79, gpaPoints: 8.0
  }, tchToken);
  ok('Block teacher from WRITING grading scheme [security]', r.status === 403 ? 200 : 500, `Got ${r.status}`);

  console.log('\n[SUBJECT CATALOG]');
  r = await api('POST', '/api/super-admin/subject-catalog', {
    schoolId, gradeLevel: '10', subject: 'Mathematics', code: 'MATH10', isCore: true, maxMarks: 100, passMarks: 33
  }, saToken);
  ok('Add Mathematics to catalog', r.status, r.data);

  r = await api('POST', '/api/super-admin/subject-catalog', {
    schoolId, gradeLevel: '10', subject: 'Physical Education', isCore: false, maxMarks: 50, passMarks: 17
  }, saToken);
  ok('Add non-core subject', r.status, r.data);

  r = await api('GET', `/api/super-admin/subject-catalog?school_id=${schoolId}&grade_level=10`, undefined, admToken);
  ok('School admin reads subject catalog', r.status, r.data);
  console.log(`  Subjects: ${r.data.subjects?.length ?? 0}`);

  console.log('\n[PERFORMANCE TEMPLATES]');
  r = await api('POST', '/api/super-admin/performance-templates', {
    name: 'Standard Quarterly',
    cycleType: 'quarterly',
    weightAcademic: 40, weightAttendance: 30, weightBehavior: 20, weightEco: 10,
    reportCardTemplate: 'standard'
  }, saToken);
  ok('Create performance template', r.status, r.data);
  const templateId = r.data.template?.id;

  r = await api('GET', '/api/super-admin/performance-templates', undefined, admToken);
  ok('School admin reads templates', r.status, r.data);
  console.log(`  Templates: ${r.data.templates?.length ?? 0}`);

  if (templateId) {
    r = await api('PATCH', `/api/super-admin/performance-templates?id=${templateId}`, {
      weightAcademic: 45, weightAttendance: 30, weightBehavior: 15, weightEco: 10,
    }, saToken);
    ok('Update template weights', r.status, r.data);

    r = await api('PATCH', `/api/super-admin/performance-templates?id=${templateId}`, {
      weightAcademic: 60, weightAttendance: 30, weightBehavior: 15, weightEco: 10,
    }, saToken);
    ok('Reject invalid weights (115, expect 400)', r.status === 400 ? 200 : 500, `Got ${r.status}`);
  }

  console.log('\n====== DONE ======');
}
main().catch(e => console.error('FATAL:', e.message));
