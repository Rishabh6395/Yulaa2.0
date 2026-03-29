const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/yulaa_dev';
const isSSL = connectionString.includes('sslmode=');

const pool = new Pool({
  connectionString,
  ...(isSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

async function seed() {
  console.log('🌱 Seeding database with demo data...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Roles
    const roleInsert = `
      INSERT INTO roles (id, code, display_name, description) VALUES
        ('00000000-0000-0000-0000-000000000001', 'super_admin', 'Super Admin', 'Platform-wide administrator'),
        ('00000000-0000-0000-0000-000000000002', 'school_admin', 'School Admin', 'School administrator'),
        ('00000000-0000-0000-0000-000000000003', 'teacher', 'Teacher', 'Teaching staff'),
        ('00000000-0000-0000-0000-000000000004', 'parent', 'Parent', 'Parent or guardian'),
        ('00000000-0000-0000-0000-000000000005', 'student', 'Student', 'Student'),
        ('00000000-0000-0000-0000-000000000006', 'vendor', 'Vendor', 'Accessories vendor'),
        ('00000000-0000-0000-0000-000000000007', 'consultant', 'Consultant', 'Career consultant')
      ON CONFLICT (code) DO NOTHING;
    `;
    await client.query(roleInsert);

    // 2. Schools
    const schoolInsert = `
      INSERT INTO schools (id, name, address, contact_email, contact_phone, plan, status, max_students) VALUES
        ('10000000-0000-0000-0000-000000000001', 'Delhi Public School - Sector 45', '123 Education Lane, Sector 45, Gurugram', 'admin@dps45.edu.in', '+91-124-555-0100', 'pro', 'active', 500),
        ('10000000-0000-0000-0000-000000000002', 'St. Mary''s International School', '456 Heritage Road, Bandra, Mumbai', 'admin@stmarys.edu.in', '+91-22-555-0200', 'starter', 'active', 300)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(schoolInsert);

    // 3. Users (password: "password123" for all demo users)
    const hash = await bcrypt.hash('password123', 10);
    const userInsert = `
      INSERT INTO users (id, email, phone, password_hash, first_name, last_name, status) VALUES
        ('20000000-0000-0000-0000-000000000001', 'superadmin@yulaa.ai', '+91-9999900000', $1, 'Yulaa', 'Admin', 'active'),
        ('20000000-0000-0000-0000-000000000002', 'admin@dps45.edu.in', '+91-9999900001', $1, 'Rajesh', 'Kumar', 'active'),
        ('20000000-0000-0000-0000-000000000003', 'priya.teacher@dps45.edu.in', '+91-9999900002', $1, 'Priya', 'Sharma', 'active'),
        ('20000000-0000-0000-0000-000000000004', 'amit.teacher@dps45.edu.in', '+91-9999900003', $1, 'Amit', 'Verma', 'active'),
        ('20000000-0000-0000-0000-000000000005', 'parent.singh@gmail.com', '+91-9999900004', $1, 'Vikram', 'Singh', 'active'),
        ('20000000-0000-0000-0000-000000000006', 'parent.patel@gmail.com', '+91-9999900005', $1, 'Neha', 'Patel', 'active'),
        ('20000000-0000-0000-0000-000000000007', 'admin@stmarys.edu.in', '+91-9999900006', $1, 'Anjali', 'D''Souza', 'active'),
        ('20000000-0000-0000-0000-000000000008', 'ravi.teacher@stmarys.edu.in', '+91-9999900007', $1, 'Ravi', 'Menon', 'active'),
        ('20000000-0000-0000-0000-000000000009', 'vendor@schoolmart.in', '+91-9999900008', $1, 'Sunil', 'Kapoor', 'active'),
        ('20000000-0000-0000-0000-000000000010', 'consultant@careers.in', '+91-9999900009', $1, 'Dr. Meera', 'Iyer', 'active'),
        ('20000000-0000-0000-0000-000000000011', 'expired.consultant@careers.in', '+91-9999900010', $1, 'Rahul', 'Bose', 'active')
      ON CONFLICT (email) DO NOTHING;
    `;
    await client.query(userInsert, [hash]);

    // 4. User Roles
    const userRoleInsert = `
      INSERT INTO user_roles (user_id, school_id, role_id, is_primary) VALUES
        ('20000000-0000-0000-0000-000000000001', NULL, '00000000-0000-0000-0000-000000000001', true),
        ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true),
        ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', true),
        ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', true),
        ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', true),
        ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', true),
        ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', true),
        ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', true),
        ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', false),
        ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', true),
        ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', true),
        ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', true)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(userRoleInsert);

    // 5. Classes
    const classInsert = `
      INSERT INTO classes (id, school_id, grade, section, capacity, academic_year) VALUES
        ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Grade 5', 'A', 35, '2025-2026'),
        ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Grade 5', 'B', 35, '2025-2026'),
        ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Grade 6', 'A', 40, '2025-2026'),
        ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Grade 7', 'A', 40, '2025-2026'),
        ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Grade 5', 'A', 30, '2025-2026'),
        ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Grade 6', 'A', 30, '2025-2026')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(classInsert);

    // 6. Teachers
    const teacherInsert = `
      INSERT INTO teachers (id, user_id, school_id, employee_id, subjects, qualification, joining_date) VALUES
        ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'DPS-T001', ARRAY['Mathematics', 'Science'], 'M.Sc, B.Ed', '2020-06-15'),
        ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'DPS-T002', ARRAY['English', 'Social Studies'], 'M.A, B.Ed', '2019-04-01'),
        ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'STM-T001', ARRAY['Science', 'Mathematics'], 'M.Sc, M.Ed', '2021-07-01')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(teacherInsert);

    // 7. Students
    const studentInsert = `
      INSERT INTO students (id, school_id, class_id, admission_no, first_name, last_name, dob, gender, admission_status, admission_date) VALUES
        ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'DPS-2025-001', 'Aarav', 'Singh', '2014-05-12', 'male', 'approved', '2025-04-01'),
        ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'DPS-2025-002', 'Ananya', 'Singh', '2015-08-22', 'female', 'approved', '2025-04-01'),
        ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'DPS-2025-003', 'Ishaan', 'Patel', '2014-11-03', 'male', 'approved', '2025-04-01'),
        ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'DPS-2025-004', 'Diya', 'Sharma', '2013-02-18', 'female', 'approved', '2025-04-01'),
        ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'DPS-2025-005', 'Arjun', 'Gupta', '2014-07-30', 'male', 'pending', NULL),
        ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005', 'STM-2025-001', 'Riya', 'Patel', '2014-12-10', 'female', 'approved', '2025-04-01'),
        ('50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'DPS-2025-006', 'Kavya', 'Mehta', '2014-09-05', 'female', 'approved', '2025-04-01'),
        ('50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'DPS-2025-007', 'Rohan', 'Das', '2014-03-15', 'male', 'approved', '2025-04-01')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(studentInsert);

    // 8. Parents
    const parentInsert = `
      INSERT INTO parents (id, user_id, occupation) VALUES
        ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'Software Engineer'),
        ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', 'Doctor')
      ON CONFLICT DO NOTHING;
    `;
    await client.query(parentInsert);

    // 9. Parent-Student links (Vikram has 2 kids at DPS, Neha has 1 at DPS + 1 at St Mary's)
    const psInsert = `
      INSERT INTO parent_students (parent_id, student_id, relationship, is_primary) VALUES
        ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'father', true),
        ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'father', true),
        ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', 'mother', true),
        ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000006', 'mother', true)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(psInsert);

    // 10. Attendance (last 7 days for some students)
    const today = new Date();
    for (let d = 1; d <= 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().split('T')[0];
      const students = [
        ['50000000-0000-0000-0000-000000000001', Math.random() > 0.15 ? 'present' : 'absent'],
        ['50000000-0000-0000-0000-000000000002', Math.random() > 0.1 ? 'present' : 'absent'],
        ['50000000-0000-0000-0000-000000000003', Math.random() > 0.2 ? 'present' : 'late'],
        ['50000000-0000-0000-0000-000000000004', Math.random() > 0.1 ? 'present' : 'absent'],
        ['50000000-0000-0000-0000-000000000007', Math.random() > 0.15 ? 'present' : 'absent'],
        ['50000000-0000-0000-0000-000000000008', Math.random() > 0.1 ? 'present' : 'late'],
      ];
      for (const [sid, status] of students) {
        await client.query(
          `INSERT INTO attendance (school_id, student_id, class_id, date, status, marked_by)
           VALUES ('10000000-0000-0000-0000-000000000001', $1,
             (SELECT class_id FROM students WHERE id = $1),
             $2, $3, '20000000-0000-0000-0000-000000000003')
           ON CONFLICT (student_id, date) DO NOTHING`,
          [sid, dateStr, status]
        );
      }
    }

    // 11. Fee Invoices
    const feeInsert = `
      INSERT INTO fee_invoices (id, school_id, student_id, invoice_no, amount, due_date, status, paid_amount) VALUES
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'INV-2025-0001', 15000, '2025-04-15', 'paid', 15000),
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'INV-2025-0002', 15000, '2025-05-15', 'paid', 15000),
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'INV-2025-0003', 15000, '2025-06-15', 'unpaid', 0),
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'INV-2025-0004', 15000, '2025-04-15', 'paid', 15000),
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'INV-2025-0005', 15000, '2025-05-15', 'overdue', 0),
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'INV-2025-0006', 12000, '2025-04-15', 'paid', 12000),
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'INV-2025-0007', 12000, '2025-05-15', 'unpaid', 0),
        (uuid_generate_v4(), '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'INV-2025-0008', 18000, '2025-05-15', 'partial', 10000)
      ON CONFLICT DO NOTHING;
    `;
    await client.query(feeInsert);

    // 12. Announcements
    const annInsert = `
      INSERT INTO announcements (school_id, title, message, type, audience, created_by) VALUES
        ('10000000-0000-0000-0000-000000000001', 'Annual Sports Day', 'Annual Sports Day will be held on 20th March 2026. All students are requested to participate actively.', 'event', 'all', '20000000-0000-0000-0000-000000000002'),
        ('10000000-0000-0000-0000-000000000001', 'Fee Payment Reminder', 'Monthly fees for March 2026 are due by 15th March. Please ensure timely payment to avoid late charges.', 'fee_reminder', 'parents', '20000000-0000-0000-0000-000000000002'),
        ('10000000-0000-0000-0000-000000000001', 'Parent-Teacher Meeting', 'PTM scheduled for 22nd March 2026, 10 AM - 1 PM. Attendance of all parents is mandatory.', 'event', 'parents', '20000000-0000-0000-0000-000000000002'),
        ('10000000-0000-0000-0000-000000000001', 'Holi Holiday', 'School will remain closed on 14th March (Friday) for Holi celebrations. Classes resume on 17th March (Monday).', 'holiday', 'all', '20000000-0000-0000-0000-000000000002')
      ON CONFLICT DO NOTHING
    `;
    await client.query(annInsert);

    // 13. Homework
    const hwInsert = `
      INSERT INTO homework (school_id, class_id, teacher_id, subject, title, description, due_date, status) VALUES
        ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Mathematics', 'Chapter 5 - Fractions Exercise', 'Complete exercises 5.1 to 5.3 from the textbook. Show all working.', CURRENT_DATE + INTERVAL '3 days', 'active'),
        ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Science', 'Plant Cell Diagram', 'Draw and label a plant cell diagram. Use colored pencils.', CURRENT_DATE + INTERVAL '2 days', 'active'),
        ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'English', 'Essay Writing', 'Write a 300-word essay on "My Favorite Festival". Use at least 3 paragraphs.', CURRENT_DATE + INTERVAL '5 days', 'active'),
        ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Social Studies', 'Map Work - India Rivers', 'Mark and label the major rivers of India on the given outline map.', CURRENT_DATE - INTERVAL '1 day', 'active')
      ON CONFLICT DO NOTHING
    `;
    await client.query(hwInsert);

    // 14. Transport routes
    const trInsert = `
      INSERT INTO transport_routes (id, school_id, route_name, bus_number, driver_name, driver_phone, capacity) VALUES
        ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sector 45-56 Route', 'DL-01-AB-1234', 'Ramesh Kumar', '+91-9876543210', 40),
        ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Sector 22-30 Route', 'DL-01-CD-5678', 'Suresh Yadav', '+91-9876543211', 35)
      ON CONFLICT DO NOTHING
    `;
    await client.query(trInsert);

    // 15. Vendor profile
    await client.query(`
      INSERT INTO vendors (id, user_id, company_name, gst_no, address) VALUES
        ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009',
         'SchoolMart Supplies Pvt. Ltd.', '07AABCS1429B1Z1',
         'Plot 14, Industrial Area Phase 2, New Delhi - 110020')
      ON CONFLICT DO NOTHING;
    `);

    // 16. Vendor inventory items
    await client.query(`
      INSERT INTO vendor_inventory (vendor_id, school_id, name, category, description, price, quantity, unit, status) VALUES
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'NCERT Mathematics Grade 5', 'books', 'NCERT prescribed Mathematics textbook for Grade 5, latest edition 2025-26', 180.00, 200, 'piece', 'available'),
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'NCERT Science Grade 5', 'books', 'NCERT prescribed Science textbook for Grade 5, latest edition 2025-26', 160.00, 200, 'piece', 'available'),
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'School Uniform Shirt (White)', 'uniform', 'Official school uniform white shirt with school logo embroidered. Available in all sizes.', 350.00, 500, 'piece', 'available'),
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'School Uniform Trousers (Navy Blue)', 'uniform', 'Official school uniform navy blue trousers. Sizes XS to XXL available.', 450.00, 400, 'piece', 'available'),
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'School ID Lanyard', 'lanyard', 'Branded school ID lanyard with retractable badge holder. Blue color with school name print.', 75.00, 600, 'piece', 'available'),
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'Stationery Kit (Complete Set)', 'stationery', 'Complete stationery kit including pencil box, 12 pencils, ruler, eraser, sharpener, and geometry set.', 299.00, 150, 'set', 'available'),
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'Sports Kit Bag', 'sports', 'Branded school sports bag with separate shoe compartment. Durable nylon material.', 599.00, 80, 'piece', 'available'),
        ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'Water Bottle (Steel)', 'other', 'BPA-free stainless steel insulated water bottle with school logo. 750ml capacity.', 349.00, 0, 'piece', 'out_of_stock')
      ON CONFLICT DO NOTHING;
    `);

    // 17. Consultant profiles
    await client.query(`
      INSERT INTO consultants (id, user_id, specialization, bio, qualifications, experience_years) VALUES
        ('90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000010',
         'Career Counselling & Higher Education',
         'Dr. Meera Iyer is a certified career counsellor with 12 years of experience helping students discover their strengths and plan their academic and professional future.',
         'Ph.D. in Educational Psychology, M.A. Career Counselling, Certified by NCDA', 12),
        ('90000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000011',
         'College Admissions & Scholarship Guidance',
         'Rahul Bose specializes in helping students secure admissions to top colleges and find scholarship opportunities.',
         'MBA, B.Tech, Certified College Admissions Counsellor', 8)
      ON CONFLICT DO NOTHING;
    `);

    // 18. Consultant contracts (active + expired)
    await client.query(`
      INSERT INTO consultant_contracts (consultant_id, school_id, contract_no, start_date, end_date, contract_value, status, notes) VALUES
        ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'CON-DPS-2025-001', '2025-01-01', '2026-12-31', 120000.00, 'active',
         'Annual contract for career counselling sessions for Grades 9-12. 2 sessions per month.'),
        ('90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
         'CON-DPS-2024-001', '2024-01-01', '2024-12-31', 80000.00, 'expired',
         'Previous year contract - expired. Not renewed.')
      ON CONFLICT DO NOTHING;
    `);

    // 19. Consultant sessions
    await client.query(`
      INSERT INTO consultant_sessions (consultant_id, school_id, title, description, session_type, target_grades, session_date, duration_minutes, max_participants, status) VALUES
        ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'Choosing the Right Stream After Grade 10',
         'A comprehensive session covering Science, Commerce, and Arts streams — what each entails, career paths, and how to decide based on strengths and interests.',
         'webinar', ARRAY['Grade 9', 'Grade 10'], NOW() + INTERVAL '7 days', 90, 100, 'scheduled'),
        ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'Engineering vs Medical: Myths & Realities',
         'Debunking common myths about engineering and medical careers. Covers JEE, NEET preparation strategies, alternative paths, and future scope.',
         'workshop', ARRAY['Grade 11', 'Grade 12'], NOW() + INTERVAL '14 days', 120, 60, 'scheduled'),
        ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         'Resume Building & Interview Skills Workshop',
         'Hands-on workshop teaching students how to build an impressive resume, craft a compelling personal statement, and ace college admission interviews.',
         'workshop', ARRAY['Grade 12'], NOW() - INTERVAL '10 days', 180, 40, 'completed')
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully!');
    console.log('\n📝 Demo login credentials (password: password123):');
    console.log('   Super Admin:       superadmin@yulaa.ai');
    console.log('   School Admin:      admin@dps45.edu.in');
    console.log('   Teacher:           priya.teacher@dps45.edu.in');
    console.log('   Parent:            parent.singh@gmail.com');
    console.log('   Vendor:            vendor@schoolmart.in');
    console.log('   Consultant:        consultant@careers.in');
    console.log('   Expired Consult.:  expired.consultant@careers.in  (login blocked)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
