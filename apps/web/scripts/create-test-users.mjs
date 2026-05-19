/**
 * Creates the minimum set of demo users needed for role-based testing.
 * Safe to run multiple times (upserts on email).
 * Run: node apps/web/scripts/create-test-users.mjs
 */
import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Inline bcrypt hash for password123 (pre-computed to avoid bcrypt install dependency)
// If you need a different password, replace these hashes (generated with bcrypt rounds=10)
const HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y'; // password123

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function q(sql, params = []) {
  const client = await pool.connect();
  try { return (await client.query(sql, params)).rows; }
  finally { client.release(); }
}

async function main() {
  console.log('\n🔑 Creating test users...\n');

  // Ensure roles exist
  const roleInserts = [
    ['super_admin', 'Super Admin'],
    ['school_admin', 'School Admin'],
    ['principal', 'Principal'],
    ['teacher', 'Teacher'],
    ['parent', 'Parent'],
    ['hod', 'HOD'],
    ['student', 'Student'],
    ['vendor', 'Vendor'],
    ['consultant', 'Consultant'],
  ];
  for (const [code, name] of roleInserts) {
    await q(`INSERT INTO roles (id, code, display_name, description) VALUES (gen_random_uuid(), $1, $2, $2)
             ON CONFLICT (code) DO NOTHING`, [code, name]);
  }
  console.log('  ✅ Roles ensured');

  // Ensure school exists
  const SCHOOL_ID = '10000000-0000-0000-0000-000000000001';
  await q(`INSERT INTO schools (id, name, address, email, phone, subscription_plan)
           VALUES ($1, 'Delhi Public School - Sector 45', '123 Education Lane, Gurugram',
                   'contact@dps45.edu.in', '+91-124-555-0100', 'pro')
           ON CONFLICT (id) DO NOTHING`, [SCHOOL_ID]);
  console.log('  ✅ School ensured');

  // Users to create
  const users = [
    { id: '20000000-0000-0000-0000-000000000001', email: 'superadmin@yulaa.ai',          first: 'Yulaa',  last: 'Admin',   role: 'super_admin',  school: null },
    { id: '20000000-0000-0000-0000-000000000002', email: 'admin@dps45.edu.in',            first: 'Rajesh', last: 'Kumar',   role: 'school_admin', school: SCHOOL_ID },
    { id: '20000000-0000-0000-0000-000000000003', email: 'priya.teacher@dps45.edu.in',    first: 'Priya',  last: 'Sharma',  role: 'teacher',      school: SCHOOL_ID },
    { id: '20000000-0000-0000-0000-000000000005', email: 'parent.singh@gmail.com',        first: 'Vikram', last: 'Singh',   role: 'parent',       school: SCHOOL_ID },
    { id: '20000000-0000-0000-0000-000000000012', email: 'principal@dps45.edu.in',        first: 'Sunita', last: 'Mehta',   role: 'principal',    school: SCHOOL_ID },
    { id: '20000000-0000-0000-0000-000000000013', email: 'hod@dps45.edu.in',              first: 'Ramesh', last: 'Nair',    role: 'hod',          school: SCHOOL_ID },
  ];

  for (const u of users) {
    // Upsert user
    await q(`INSERT INTO users (id, email, password_hash, first_name, last_name, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             ON CONFLICT (email) DO UPDATE SET password_hash=$3, status='active'`,
      [u.id, u.email, HASH, u.first, u.last]);

    // Get role id
    const [role] = await q(`SELECT id FROM roles WHERE code=$1`, [u.role]);
    if (!role) { console.log(`  ⚠️  Role not found: ${u.role}`); continue; }

    // Upsert user_role (primary role) — delete existing then insert to avoid type conflicts
    await q(`DELETE FROM user_roles WHERE user_id=$1 AND role_id=$2`, [u.id, role.id]);
    if (u.school) {
      await q(`INSERT INTO user_roles (id, user_id, role_id, school_id, is_primary)
               VALUES (gen_random_uuid(), $1, $2, $3, true)`,
        [u.id, role.id, u.school]);
    } else {
      await q(`INSERT INTO user_roles (id, user_id, role_id, is_primary)
               VALUES (gen_random_uuid(), $1, $2, true)`,
        [u.id, role.id]);
    }

    console.log(`  ✅ ${u.role.padEnd(12)} ${u.email}`);
  }

  console.log('\n✅ Done! All test users have password: password123\n');
  console.log('Test accounts:');
  for (const u of users) console.log(`  ${u.role.padEnd(12)} → ${u.email}`);
  console.log('');
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => pool.end());
