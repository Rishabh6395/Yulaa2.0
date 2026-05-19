/**
 * Role-based API transaction test
 * Tests every major endpoint for every role and reports pass/fail
 * Run: node apps/web/scripts/test-roles.mjs
 */

const BASE = 'http://localhost:3000';

const ROLES = [
  { label: 'super_admin',  email: 'superadmin@yulaa.ai',          password: 'password123' },
  { label: 'school_admin', email: 'admin@dps45.edu.in',           password: 'password123' },
  { label: 'principal',    email: 'admin@dps45.edu.in',           password: 'password123' }, // use admin as principal proxy
  { label: 'teacher',      email: 'priya.teacher@dps45.edu.in',   password: 'password123' },
  { label: 'parent',       email: 'parent.singh@gmail.com',       password: 'password123' },
  { label: 'vendor',       email: 'vendor@schoolmart.in',         password: 'password123' },
  { label: 'consultant',   email: 'consultant@careers.in',        password: 'password123' },
];

const SCHOOL_ID = '10000000-0000-0000-0000-000000000001'; // DPS

const results = [];

function status(code) {
  if (code >= 200 && code < 300) return '✅';
  if (code === 401) return '🔒';
  if (code === 403) return '⛔';
  if (code === 404) return '❓';
  if (code >= 500) return '🔴';
  return `⚠️ `;
}

async function req(method, path, token, body) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, opts);
    let data;
    try { data = await r.json(); } catch { data = {}; }
    return { code: r.status, data };
  } catch (e) {
    return { code: 0, data: { error: e.message } };
  }
}

async function login(email, password) {
  const r = await req('POST', '/api/auth/login', null, { email, password });
  return r.code === 200 ? r.data.token : null;
}

function row(role, endpoint, code, note = '') {
  results.push({ role, endpoint, code, icon: status(code), note });
}

async function testRole(roleLabel, token) {
  const h = (ep, code, note) => row(roleLabel, ep, code, note);

  // ── Dashboard ──────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/dashboard', token);
    h('GET /api/dashboard', r.code);
  }

  // ── Students ───────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/students', token);
    h('GET /api/students', r.code);
  }

  // ── Teachers ───────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/teachers', token);
    h('GET /api/teachers', r.code);
  }

  // ── Classes ────────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/classes', token);
    h('GET /api/classes', r.code);
  }

  // ── Attendance ────────────────────────────────────────────────────
  {
    const today = new Date().toISOString().slice(0, 10);
    const r = await req('GET', `/api/attendance?date=${today}`, token);
    h('GET /api/attendance', r.code);
  }

  // ── Homework ──────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/homework', token);
    h('GET /api/homework', r.code);
  }

  // ── Exams ─────────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/exams', token);
    h('GET /api/exams', r.code);
  }

  // ── Fees ──────────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/fees', token);
    h('GET /api/fees', r.code);
  }

  // ── Announcements ─────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/announcements', token);
    h('GET /api/announcements', r.code);
  }

  // ── Leave ─────────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/leave', token);
    h('GET /api/leave', r.code);
  }

  // ── Admission Applications ────────────────────────────────────────
  {
    const r = await req('GET', '/api/admission/applications', token);
    h('GET /api/admission/applications', r.code);
  }

  // ── Queries ───────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/queries', token);
    h('GET /api/queries', r.code);
  }

  // ── Timetable ─────────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/timetable', token);
    h('GET /api/timetable', r.code);
  }

  // ── Performance ───────────────────────────────────────────────────
  {
    const r = await req('GET', `/api/performance?school_id=${SCHOOL_ID}`, token);
    h('GET /api/performance', r.code);
  }

  // ── Menu Permissions ──────────────────────────────────────────────
  {
    const r = await req('GET', '/api/menu-permissions', token);
    h('GET /api/menu-permissions', r.code);
  }

  // ── Role-specific extras ─────────────────────────────────────────
  if (roleLabel === 'super_admin') {
    const r1 = await req('GET', '/api/super-admin/schools', token);
    h('GET /api/super-admin/schools', r1.code);

    const r2 = await req('GET', `/api/super-admin/performance-config?school_id=${SCHOOL_ID}`, token);
    h('GET /api/super-admin/performance-config', r2.code);

    const r3 = await req('GET', '/api/super-admin/queries', token);
    h('GET /api/super-admin/queries', r3.code);
  }

  if (roleLabel === 'parent') {
    const r1 = await req('GET', '/api/parent/children', token);
    h('GET /api/parent/children', r1.code, r1.data.children?.length + ' children' || '');

    const r2 = await req('GET', '/api/admission/applications', token);
    h('GET /api/admission/applications (own)', r2.code);
  }

  if (roleLabel === 'teacher') {
    const r1 = await req('GET', '/api/syllabus', token);
    h('GET /api/syllabus', r1.code);

    const r2 = await req('GET', '/api/online-classes', token);
    h('GET /api/online-classes', r2.code);
  }

  if (roleLabel === 'vendor') {
    const r1 = await req('GET', '/api/vendor/products', token);
    h('GET /api/vendor/products', r1.code);

    const r2 = await req('GET', '/api/vendor/orders', token);
    h('GET /api/vendor/orders', r2.code);
  }

  if (roleLabel === 'consultant') {
    const r1 = await req('GET', '/api/consultant/sessions', token);
    h('GET /api/consultant/sessions', r1.code);
  }
}

// ── WRITE TRANSACTION TESTS ────────────────────────────────────────────────

async function testWrites(roleLabel, token) {
  const h = (ep, code, note) => row(roleLabel, ep, code, note);

  // Only test writes for roles that should be able to write
  if (roleLabel === 'school_admin') {
    // Create announcement
    const r1 = await req('POST', '/api/announcements', token, {
      title: '[TEST] Role Test Announcement',
      message: 'Automated test announcement — safe to delete',
      target_roles: ['teacher'],
      priority: 'normal',
    });
    h('POST /api/announcements', r1.code);

    // Create homework
    const classesR = await req('GET', '/api/classes', token);
    const classId = classesR.data?.classes?.[0]?.id;
    if (classId) {
      const r2 = await req('POST', '/api/homework', token, {
        title: '[TEST] Role Test HW',
        description: 'Automated test homework',
        class_id: classId,
        subject: 'Mathematics',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      });
      h('POST /api/homework', r2.code);
    }
  }

  if (roleLabel === 'teacher') {
    // Submit attendance
    const classesR = await req('GET', '/api/classes', token);
    const classId = classesR.data?.classes?.[0]?.id;
    if (classId) {
      const today = new Date().toISOString().slice(0, 10);
      const r = await req('POST', '/api/attendance', token, {
        class_id: classId,
        date: today,
        records: [],
      });
      h('POST /api/attendance', r.code, r.code >= 400 ? r.data?.error?.slice(0, 60) : '');
    }
  }

  if (roleLabel === 'parent') {
    // Submit a query
    const r = await req('POST', '/api/queries', token, {
      subject: '[TEST] Role Test Query',
      message: 'Automated test query — safe to delete',
    });
    h('POST /api/queries', r.code);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         Yulaa 2.0 — Full Role API Transaction Test           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  for (const { label, email, password } of ROLES) {
    process.stdout.write(`\n🔐 Logging in as ${label} (${email})... `);
    const token = await login(email, password);
    if (!token) {
      console.log('❌ LOGIN FAILED');
      row(label, 'POST /api/auth/login', 0, 'Login failed — skipping role');
      continue;
    }
    console.log('✅');

    await testRole(label, token);
    await testWrites(label, token);
  }

  // ── Public endpoints ───────────────────────────────────────────────
  console.log('\n🌐 Testing public endpoints (no auth)...');
  const pub1 = await req('GET', `/api/admission/grades?schoolId=${SCHOOL_ID}`, null);
  row('PUBLIC', `GET /api/admission/grades`, pub1.code, `grades: ${pub1.data?.grades?.length ?? 'err'}`);

  const pub2 = await req('GET', `/api/schools/${SCHOOL_ID}`, null);
  row('PUBLIC', `GET /api/schools/:id`, pub2.code);

  // ── Print Results ──────────────────────────────────────────────────
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST RESULTS                                 ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  let lastRole = '';
  let pass = 0, fail = 0;

  for (const r of results) {
    if (r.role !== lastRole) {
      console.log(`╠── ${r.role.toUpperCase().padEnd(68, '─')}╣`);
      lastRole = r.role;
    }
    const ok = r.code >= 200 && r.code < 300;
    const isExpected403 = r.code === 403;
    if (ok) pass++; else if (!isExpected403) fail++;

    const ep   = r.endpoint.padEnd(45);
    const code = String(r.code).padStart(3);
    const note = r.note ? ` ← ${r.note}` : '';
    console.log(`║  ${r.icon} ${ep} ${code}${note}`);
  }

  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  PASS: ${String(pass).padEnd(5)}  FAIL: ${String(fail).padEnd(5)}  TOTAL: ${String(results.length).padEnd(20)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // ── Failures summary ───────────────────────────────────────────────
  const failures = results.filter(r => r.code < 200 || (r.code >= 300 && r.code !== 403));
  if (failures.length > 0) {
    console.log('🚨 FAILURES:\n');
    for (const f of failures) {
      console.log(`  [${f.role}] ${f.endpoint} → ${f.code} ${f.note}`);
    }
    console.log('');
  }
}

main().catch(console.error);
