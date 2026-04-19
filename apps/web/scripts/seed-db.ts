import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fixed IDs for deterministic seeding
const IDs = {
  roles: {
    superAdmin:  '00000000-0000-0000-0000-000000000001',
    schoolAdmin: '00000000-0000-0000-0000-000000000002',
    teacher:     '00000000-0000-0000-0000-000000000003',
    parent:      '00000000-0000-0000-0000-000000000004',
    student:     '00000000-0000-0000-0000-000000000005',
    vendor:      '00000000-0000-0000-0000-000000000006',
    consultant:  '00000000-0000-0000-0000-000000000007',
    employee:    '00000000-0000-0000-0000-000000000008',
    hod:         '00000000-0000-0000-0000-000000000009',
    principal:   '00000000-0000-0000-0000-000000000010',
  },
  schools: {
    dps:    '10000000-0000-0000-0000-000000000001',
    stmary: '10000000-0000-0000-0000-000000000002',
  },
  users: {
    superAdmin:         '20000000-0000-0000-0000-000000000001',
    dpsAdmin:           '20000000-0000-0000-0000-000000000002',
    priyaTeacher:       '20000000-0000-0000-0000-000000000003',
    amitTeacher:        '20000000-0000-0000-0000-000000000004',
    vikramParent:       '20000000-0000-0000-0000-000000000005',
    nehaParent:         '20000000-0000-0000-0000-000000000006',
    stmaryAdmin:        '20000000-0000-0000-0000-000000000007',
    raviTeacher:        '20000000-0000-0000-0000-000000000008',
    vendor:             '20000000-0000-0000-0000-000000000009',
    consultant:         '20000000-0000-0000-0000-000000000010',
    expiredConsultant:  '20000000-0000-0000-0000-000000000011',
  },
  classes: {
    dps5A: '30000000-0000-0000-0000-000000000001',
    dps5B: '30000000-0000-0000-0000-000000000002',
    dps6A: '30000000-0000-0000-0000-000000000003',
    dps7A: '30000000-0000-0000-0000-000000000004',
    stm5A: '30000000-0000-0000-0000-000000000005',
    stm6A: '30000000-0000-0000-0000-000000000006',
  },
  teachers: {
    priya: '40000000-0000-0000-0000-000000000001',
    amit:  '40000000-0000-0000-0000-000000000002',
    ravi:  '40000000-0000-0000-0000-000000000003',
  },
  students: {
    aarav:  '50000000-0000-0000-0000-000000000001',
    ananya: '50000000-0000-0000-0000-000000000002',
    ishaan: '50000000-0000-0000-0000-000000000003',
    diya:   '50000000-0000-0000-0000-000000000004',
    arjun:  '50000000-0000-0000-0000-000000000005',
    riya:   '50000000-0000-0000-0000-000000000006',
    kavya:  '50000000-0000-0000-0000-000000000007',
    rohan:  '50000000-0000-0000-0000-000000000008',
  },
  parents: {
    vikram: '60000000-0000-0000-0000-000000000001',
    neha:   '60000000-0000-0000-0000-000000000002',
  },
  vendor:      '80000000-0000-0000-0000-000000000001',
  consultants: {
    meera: '90000000-0000-0000-0000-000000000001',
    rahul: '90000000-0000-0000-0000-000000000002',
  },
};

async function seed() {
  console.log('🌱 Seeding database with demo data...');
  const hash = await bcrypt.hash('password123', 10);

  // 1. Roles
  console.log('  → Roles');
  const roles = [
    { id: IDs.roles.superAdmin,  code: 'super_admin',  displayName: 'Super Admin',   description: 'Platform-wide administrator' },
    { id: IDs.roles.schoolAdmin, code: 'school_admin', displayName: 'School Admin',  description: 'School administrator' },
    { id: IDs.roles.teacher,     code: 'teacher',      displayName: 'Teacher',        description: 'Teaching staff' },
    { id: IDs.roles.parent,      code: 'parent',       displayName: 'Parent',         description: 'Parent or guardian' },
    { id: IDs.roles.student,     code: 'student',      displayName: 'Student',        description: 'Student' },
    { id: IDs.roles.vendor,      code: 'vendor',       displayName: 'Vendor',         description: 'Accessories vendor' },
    { id: IDs.roles.consultant,  code: 'consultant',   displayName: 'Consultant',     description: 'Career consultant' },
    { id: IDs.roles.employee,    code: 'employee',     displayName: 'Employee',       description: 'School employee (Teacher, HOD, Principal, Admin)' },
    { id: IDs.roles.hod,         code: 'hod',          displayName: 'HOD',            description: 'Head of Department' },
    { id: IDs.roles.principal,   code: 'principal',    displayName: 'Principal',      description: 'School Principal' },
  ];
  for (const role of roles) {
    await prisma.role.create({ data: role }).catch(() => {});
  }

  // 2. Schools
  console.log('  → Schools');
  await prisma.school.create({
    data: {
      id: IDs.schools.dps,
      name: 'Delhi Public School - Sector 45',
      address: '123 Education Lane, Sector 45, Gurugram',
      email: 'contact@dps45.edu.in',
      phone: '+91-124-555-0100',
      subscriptionPlan: 'pro',
    },
  }).catch(() => {});
  await prisma.school.create({
    data: {
      id: IDs.schools.stmary,
      name: "St. Mary's International School",
      address: '456 Heritage Road, Bandra, Mumbai',
      email: 'contact@stmarys.edu.in',
      phone: '+91-22-555-0200',
      subscriptionPlan: 'starter',
    },
  }).catch(() => {});

  // 2.5 Masters (Phase 1)
  console.log('  → Masters');
  const schools = [IDs.schools.dps, IDs.schools.stmary];
  
  for (const schoolId of schools) {
    // Gender Master
    const genders = [
      { name: 'Male', sortOrder: 1 },
      { name: 'Female', sortOrder: 2 },
      { name: 'Other', sortOrder: 3 },
    ];
    for (const gender of genders) {
      await prisma.genderMaster.upsert({
        where: { schoolId_name: { schoolId, name: gender.name } },
        update: {},
        create: { schoolId, ...gender },
      });
    }

    // Blood Group Master
    const bloodGroups = [
      { name: 'A+', sortOrder: 1 },
      { name: 'A-', sortOrder: 2 },
      { name: 'B+', sortOrder: 3 },
      { name: 'B-', sortOrder: 4 },
      { name: 'AB+', sortOrder: 5 },
      { name: 'AB-', sortOrder: 6 },
      { name: 'O+', sortOrder: 7 },
      { name: 'O-', sortOrder: 8 },
    ];
    for (const bg of bloodGroups) {
      await prisma.bloodGroupMaster.upsert({
        where: { schoolId_name: { schoolId, name: bg.name } },
        update: {},
        create: { schoolId, ...bg },
      });
    }

    // Qualification Master
    const qualifications = [
      { name: 'B.Ed', sortOrder: 1 },
      { name: 'M.Ed', sortOrder: 2 },
      { name: 'M.Sc', sortOrder: 3 },
      { name: 'M.A', sortOrder: 4 },
      { name: 'B.Sc', sortOrder: 5 },
      { name: 'B.A', sortOrder: 6 },
      { name: 'Ph.D', sortOrder: 7 },
    ];
    for (const qual of qualifications) {
      await prisma.qualificationMaster.upsert({
        where: { schoolId_name: { schoolId, name: qual.name } },
        update: {},
        create: { schoolId, ...qual },
      });
    }

    // Stream Master
    const streams = [
      { name: 'Science', sortOrder: 1 },
      { name: 'Commerce', sortOrder: 2 },
      { name: 'Arts', sortOrder: 3 },
    ];
    for (const stream of streams) {
      await prisma.streamMaster.upsert({
        where: { schoolId_name: { schoolId, name: stream.name } },
        update: {},
        create: { schoolId, ...stream },
      });
    }

    // Event Type Master
    const eventTypes = [
      { name: 'Sports', code: 'sports', sortOrder: 1 },
      { name: 'Cultural', code: 'cultural', sortOrder: 2 },
      { name: 'Academic', code: 'academic', sortOrder: 3 },
      { name: 'Holiday', code: 'holiday', sortOrder: 4 },
    ];
    for (const et of eventTypes) {
      await prisma.eventTypeMaster.upsert({
        where: { schoolId_code: { schoolId, code: et.code } },
        update: {},
        create: { schoolId, ...et },
      });
    }

    // Country Master
    const countries = [
      { name: 'India', code: 'IND', sortOrder: 1 },
      { name: 'United States', code: 'USA', sortOrder: 2 },
      { name: 'United Kingdom', code: 'GBR', sortOrder: 3 },
    ];
    for (const country of countries) {
      await prisma.countryMaster.upsert({
        where: { schoolId_code: { schoolId, code: country.code } },
        update: {},
        create: { schoolId, ...country },
      });
    }

    // For India, add states
    const indiaId = (await prisma.countryMaster.findFirst({ where: { schoolId, code: 'IND' } }))?.id;
    if (indiaId) {
      const states = [
        { name: 'Delhi', code: 'DL', sortOrder: 1 },
        { name: 'Maharashtra', code: 'MH', sortOrder: 2 },
        { name: 'Karnataka', code: 'KA', sortOrder: 3 },
        { name: 'Haryana', code: 'HR', sortOrder: 4 },
      ];
      for (const state of states) {
        await prisma.stateMaster.upsert({
          where: { schoolId_countryId_name: { schoolId, countryId: indiaId, name: state.name } },
          update: {},
          create: { schoolId, countryId: indiaId, ...state },
        });
      }

      // For Delhi, add districts
      const delhiId = (await prisma.stateMaster.findFirst({ where: { schoolId, countryId: indiaId, code: 'DL' } }))?.id;
      if (delhiId) {
        const districts = [
          { name: 'New Delhi', sortOrder: 1 },
          { name: 'North Delhi', sortOrder: 2 },
          { name: 'South Delhi', sortOrder: 3 },
        ];
        for (const district of districts) {
          await prisma.districtMaster.upsert({
            where: { schoolId_stateId_name: { schoolId, stateId: delhiId, name: district.name } },
            update: {},
            create: { schoolId, stateId: delhiId, ...district },
          });
        }
      }
    }

    // Leave Type Master (already exists, but ensure it's seeded)
    const leaveTypes = [
      { name: 'Casual Leave', code: 'CL', applicableTo: ['teacher', 'employee'] },
      { name: 'Sick Leave', code: 'SL', applicableTo: ['teacher', 'employee'] },
      { name: 'Earned Leave', code: 'EL', applicableTo: ['teacher', 'employee'] },
      { name: 'Maternity Leave', code: 'ML', applicableTo: ['teacher', 'employee'] },
    ];
    for (const lt of leaveTypes) {
      await prisma.leaveTypeMaster.upsert({
        where: { schoolId_code: { schoolId, code: lt.code } },
        update: {},
        create: { schoolId, ...lt },
      });
    }

  }

  // 2.6 Workflows (Phase 2)
  console.log('  → Workflows');
  
  for (const schoolId of schools) {
    // Admission Workflow
    const admissionWorkflow = await prisma.admissionWorkflow.upsert({
      where: { schoolId_name: { schoolId, name: 'Default Admission Workflow' } },
      update: {},
      create: {
        schoolId,
        name: 'Default Admission Workflow',
        isActive: true,
      },
    });

    // Admission Workflow Steps
    const admissionSteps = [
      { stepOrder: 1, label: 'Parent Application', approverRole: 'parent', notifyMessage: 'Application submitted successfully' },
      { stepOrder: 2, label: 'School Admin Review', approverRole: 'school_admin', notifyMessage: 'Application under review' },
      { stepOrder: 3, label: 'Principal Approval', approverRole: 'principal', notifyMessage: 'Application sent for final approval' },
      { stepOrder: 4, label: 'Final Approval', approverRole: 'school_admin', isFinal: true, notifyMessage: 'Application approved, student record created' },
    ];
    for (const step of admissionSteps) {
      await prisma.admissionWorkflowStep.upsert({
        where: { workflowId_stepOrder: { workflowId: admissionWorkflow.id, stepOrder: step.stepOrder } },
        update: {},
        create: { workflowId: admissionWorkflow.id, ...step },
      });
    }

    // Leave Workflow
    const leaveWorkflow = await prisma.leaveWorkflow.upsert({
      where: { schoolId_type: { schoolId, type: 'default' } },
      update: {},
      create: {
        schoolId,
        type: 'default',
        isActive: true,
      },
    });

    // Leave Workflow Steps
    const leaveSteps = [
      { stepOrder: 1, label: 'Employee Application', approverRole: 'employee', notifyMessage: 'Leave application submitted' },
      { stepOrder: 2, label: 'Teacher/Supervisor Review', approverRole: 'teacher', notifyMessage: 'Leave application under review' },
      { stepOrder: 3, label: 'HOD/Principal Approval', approverRole: 'hod', notifyMessage: 'Leave sent for final approval' },
      { stepOrder: 4, label: 'Final Approval', approverRole: 'principal', notifyMessage: 'Leave approved' },
    ];
    for (const step of leaveSteps) {
      await prisma.leaveWorkflowStep.upsert({
        where: { workflowId_stepOrder: { workflowId: leaveWorkflow.id, stepOrder: step.stepOrder } },
        update: {},
        create: { workflowId: leaveWorkflow.id, ...step },
      });
    }
  }

  // 3. Users
  console.log('  → Users');
  const users = [
    { id: IDs.users.superAdmin,        email: 'superadmin@yulaa.ai',              firstName: 'Yulaa',     lastName: 'Admin',    phone: '+91-9999900000' },
    { id: IDs.users.dpsAdmin,          email: 'admin@dps45.edu.in',               firstName: 'Rajesh',    lastName: 'Kumar',    phone: '+91-9999900001' },
    { id: IDs.users.priyaTeacher,      email: 'priya.teacher@dps45.edu.in',       firstName: 'Priya',     lastName: 'Sharma',   phone: '+91-9999900002' },
    { id: IDs.users.amitTeacher,       email: 'amit.teacher@dps45.edu.in',        firstName: 'Amit',      lastName: 'Verma',    phone: '+91-9999900003' },
    { id: IDs.users.vikramParent,      email: 'parent.singh@gmail.com',           firstName: 'Vikram',    lastName: 'Singh',    phone: '+91-9999900004' },
    { id: IDs.users.nehaParent,        email: 'parent.patel@gmail.com',           firstName: 'Neha',      lastName: 'Patel',    phone: '+91-9999900005' },
    { id: IDs.users.stmaryAdmin,       email: 'admin@stmarys.edu.in',             firstName: 'Anjali',    lastName: "D'Souza",  phone: '+91-9999900006' },
    { id: IDs.users.raviTeacher,       email: 'ravi.teacher@stmarys.edu.in',      firstName: 'Ravi',      lastName: 'Menon',    phone: '+91-9999900007' },
    { id: IDs.users.vendor,            email: 'vendor@schoolmart.in',             firstName: 'Sunil',     lastName: 'Kapoor',   phone: '+91-9999900008' },
    { id: IDs.users.consultant,        email: 'consultant@careers.in',            firstName: 'Dr. Meera', lastName: 'Iyer',     phone: '+91-9999900009' },
    { id: IDs.users.expiredConsultant, email: 'expired.consultant@careers.in',    firstName: 'Rahul',     lastName: 'Bose',     phone: '+91-9999900010' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: hash },
    });
  }

  // 4. User Roles
  console.log('  → User Roles');
  const userRoleData = [
    { userId: IDs.users.superAdmin,        roleId: IDs.roles.superAdmin,  schoolId: null,               isPrimary: true  },
    // School admins, teachers, principals — primary role + secondary employee role
    { userId: IDs.users.dpsAdmin,          roleId: IDs.roles.schoolAdmin, schoolId: IDs.schools.dps,    isPrimary: true  },
    { userId: IDs.users.dpsAdmin,          roleId: IDs.roles.employee,    schoolId: IDs.schools.dps,    isPrimary: false },
    { userId: IDs.users.priyaTeacher,      roleId: IDs.roles.teacher,     schoolId: IDs.schools.dps,    isPrimary: true  },
    { userId: IDs.users.priyaTeacher,      roleId: IDs.roles.employee,    schoolId: IDs.schools.dps,    isPrimary: false },
    { userId: IDs.users.amitTeacher,       roleId: IDs.roles.teacher,     schoolId: IDs.schools.dps,    isPrimary: true  },
    { userId: IDs.users.amitTeacher,       roleId: IDs.roles.employee,    schoolId: IDs.schools.dps,    isPrimary: false },
    { userId: IDs.users.vikramParent,      roleId: IDs.roles.parent,      schoolId: IDs.schools.dps,    isPrimary: true  },
    { userId: IDs.users.nehaParent,        roleId: IDs.roles.parent,      schoolId: IDs.schools.dps,    isPrimary: true  },
    { userId: IDs.users.nehaParent,        roleId: IDs.roles.parent,      schoolId: IDs.schools.stmary, isPrimary: false },
    { userId: IDs.users.stmaryAdmin,       roleId: IDs.roles.schoolAdmin, schoolId: IDs.schools.stmary, isPrimary: true  },
    { userId: IDs.users.stmaryAdmin,       roleId: IDs.roles.employee,    schoolId: IDs.schools.stmary, isPrimary: false },
    { userId: IDs.users.raviTeacher,       roleId: IDs.roles.teacher,     schoolId: IDs.schools.stmary, isPrimary: true  },
    { userId: IDs.users.raviTeacher,       roleId: IDs.roles.employee,    schoolId: IDs.schools.stmary, isPrimary: false },
    { userId: IDs.users.vendor,            roleId: IDs.roles.vendor,      schoolId: IDs.schools.dps,    isPrimary: true  },
    { userId: IDs.users.consultant,        roleId: IDs.roles.consultant,  schoolId: IDs.schools.dps,    isPrimary: true  },
    { userId: IDs.users.expiredConsultant, roleId: IDs.roles.consultant,  schoolId: IDs.schools.dps,    isPrimary: true  },
  ];
  for (const ur of userRoleData) {
    await prisma.userRole.create({ data: ur }).catch(() => {});
  }

  // 5. Classes
  console.log('  → Classes');
  const classes = [
    { id: IDs.classes.dps5A, schoolId: IDs.schools.dps,    name: 'Grade 5 - A', grade: 'Grade 5', section: 'A', academicYear: '2025-2026', maxStudents: 35 },
    { id: IDs.classes.dps5B, schoolId: IDs.schools.dps,    name: 'Grade 5 - B', grade: 'Grade 5', section: 'B', academicYear: '2025-2026', maxStudents: 35 },
    { id: IDs.classes.dps6A, schoolId: IDs.schools.dps,    name: 'Grade 6 - A', grade: 'Grade 6', section: 'A', academicYear: '2025-2026', maxStudents: 40 },
    { id: IDs.classes.dps7A, schoolId: IDs.schools.dps,    name: 'Grade 7 - A', grade: 'Grade 7', section: 'A', academicYear: '2025-2026', maxStudents: 40 },
    { id: IDs.classes.stm5A, schoolId: IDs.schools.stmary, name: 'Grade 5 - A', grade: 'Grade 5', section: 'A', academicYear: '2025-2026', maxStudents: 30 },
    { id: IDs.classes.stm6A, schoolId: IDs.schools.stmary, name: 'Grade 6 - A', grade: 'Grade 6', section: 'A', academicYear: '2025-2026', maxStudents: 30 },
  ];
  for (const cls of classes) {
    await prisma.class.upsert({ where: { id: cls.id }, update: {}, create: cls });
  }

  // 6. Teachers
  console.log('  → Teachers');
  await prisma.teacher.upsert({
    where: { id: IDs.teachers.priya },
    update: {},
    create: { id: IDs.teachers.priya, userId: IDs.users.priyaTeacher, schoolId: IDs.schools.dps, employeeId: 'DPS-T001', designation: 'Senior Teacher', department: 'Science', qualification: 'M.Sc, B.Ed', experienceYears: 5, joiningDate: new Date('2020-06-15') },
  });
  await prisma.teacher.upsert({
    where: { id: IDs.teachers.amit },
    update: {},
    create: { id: IDs.teachers.amit, userId: IDs.users.amitTeacher, schoolId: IDs.schools.dps, employeeId: 'DPS-T002', designation: 'Teacher', department: 'Humanities', qualification: 'M.A, B.Ed', experienceYears: 6, joiningDate: new Date('2019-04-01') },
  });
  await prisma.teacher.upsert({
    where: { id: IDs.teachers.ravi },
    update: {},
    create: { id: IDs.teachers.ravi, userId: IDs.users.raviTeacher, schoolId: IDs.schools.stmary, employeeId: 'STM-T001', designation: 'Senior Teacher', department: 'Science', qualification: 'M.Sc, M.Ed', experienceYears: 4, joiningDate: new Date('2021-07-01') },
  });

  // 7. Students
  console.log('  → Students');
  const students = [
    { id: IDs.students.aarav,  schoolId: IDs.schools.dps,    classId: IDs.classes.dps5A, admissionNo: 'DPS-2025-001', firstName: 'Aarav',  lastName: 'Singh',  dateOfBirth: new Date('2014-05-12'), gender: 'male',   status: 'active' },
    { id: IDs.students.ananya, schoolId: IDs.schools.dps,    classId: IDs.classes.dps5A, admissionNo: 'DPS-2025-002', firstName: 'Ananya', lastName: 'Singh',  dateOfBirth: new Date('2015-08-22'), gender: 'female', status: 'active' },
    { id: IDs.students.ishaan, schoolId: IDs.schools.dps,    classId: IDs.classes.dps5B, admissionNo: 'DPS-2025-003', firstName: 'Ishaan', lastName: 'Patel',  dateOfBirth: new Date('2014-11-03'), gender: 'male',   status: 'active' },
    { id: IDs.students.diya,   schoolId: IDs.schools.dps,    classId: IDs.classes.dps6A, admissionNo: 'DPS-2025-004', firstName: 'Diya',   lastName: 'Sharma', dateOfBirth: new Date('2013-02-18'), gender: 'female', status: 'active' },
    { id: IDs.students.arjun,  schoolId: IDs.schools.dps,    classId: IDs.classes.dps5A, admissionNo: 'DPS-2025-005', firstName: 'Arjun',  lastName: 'Gupta',  dateOfBirth: new Date('2014-07-30'), gender: 'male',   status: 'pending' },
    { id: IDs.students.riya,   schoolId: IDs.schools.stmary, classId: IDs.classes.stm5A, admissionNo: 'STM-2025-001', firstName: 'Riya',   lastName: 'Patel',  dateOfBirth: new Date('2014-12-10'), gender: 'female', status: 'active' },
    { id: IDs.students.kavya,  schoolId: IDs.schools.dps,    classId: IDs.classes.dps5A, admissionNo: 'DPS-2025-006', firstName: 'Kavya',  lastName: 'Mehta',  dateOfBirth: new Date('2014-09-05'), gender: 'female', status: 'active' },
    { id: IDs.students.rohan,  schoolId: IDs.schools.dps,    classId: IDs.classes.dps5B, admissionNo: 'DPS-2025-007', firstName: 'Rohan',  lastName: 'Das',    dateOfBirth: new Date('2014-03-15'), gender: 'male',   status: 'active' },
  ];
  for (const s of students) {
    await prisma.student.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // 8. Parents
  console.log('  → Parents');
  await prisma.parent.upsert({ where: { userId: IDs.users.vikramParent }, update: {}, create: { id: IDs.parents.vikram, userId: IDs.users.vikramParent, occupation: 'Software Engineer' } });
  await prisma.parent.upsert({ where: { userId: IDs.users.nehaParent },   update: {}, create: { id: IDs.parents.neha,   userId: IDs.users.nehaParent,   occupation: 'Doctor' } });

  // 9. Parent-Student links
  console.log('  → Parent-Student links');
  const psLinks = [
    { parentId: IDs.parents.vikram, studentId: IDs.students.aarav,  relationship: 'father', isPrimary: true },
    { parentId: IDs.parents.vikram, studentId: IDs.students.ananya, relationship: 'father', isPrimary: false },
    { parentId: IDs.parents.neha,   studentId: IDs.students.ishaan, relationship: 'mother', isPrimary: true },
    { parentId: IDs.parents.neha,   studentId: IDs.students.riya,   relationship: 'mother', isPrimary: false },
  ];
  for (const ps of psLinks) {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: ps.parentId, studentId: ps.studentId } },
      update: {},
      create: ps,
    });
  }

  // 10. Attendance (last 7 weekdays)
  console.log('  → Attendance');
  const attendanceStudents = [
    { id: IDs.students.aarav,  classId: IDs.classes.dps5A },
    { id: IDs.students.ananya, classId: IDs.classes.dps5A },
    { id: IDs.students.ishaan, classId: IDs.classes.dps5B },
    { id: IDs.students.diya,   classId: IDs.classes.dps6A },
    { id: IDs.students.kavya,  classId: IDs.classes.dps5A },
    { id: IDs.students.rohan,  classId: IDs.classes.dps5B },
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let d = 1; d <= 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    for (const s of attendanceStudents) {
      const status = Math.random() > 0.15 ? 'present' : 'absent';
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: s.id, date } },
        update: {},
        create: { schoolId: IDs.schools.dps, studentId: s.id, classId: s.classId, date, status, markedBy: IDs.users.priyaTeacher },
      });
    }
  }

  // 11. Fee Invoices
  console.log('  → Fee Invoices');
  const invoices = [
    { schoolId: IDs.schools.dps, studentId: IDs.students.aarav,  invoiceNo: 'INV-2025-0001', amount: 15000, dueDate: new Date('2025-04-15'), status: 'paid',    paidAmount: 15000 },
    { schoolId: IDs.schools.dps, studentId: IDs.students.aarav,  invoiceNo: 'INV-2025-0002', amount: 15000, dueDate: new Date('2025-05-15'), status: 'paid',    paidAmount: 15000 },
    { schoolId: IDs.schools.dps, studentId: IDs.students.aarav,  invoiceNo: 'INV-2025-0003', amount: 15000, dueDate: new Date('2025-06-15'), status: 'unpaid',  paidAmount: 0     },
    { schoolId: IDs.schools.dps, studentId: IDs.students.ananya, invoiceNo: 'INV-2025-0004', amount: 15000, dueDate: new Date('2025-04-15'), status: 'paid',    paidAmount: 15000 },
    { schoolId: IDs.schools.dps, studentId: IDs.students.ananya, invoiceNo: 'INV-2025-0005', amount: 15000, dueDate: new Date('2025-05-15'), status: 'overdue', paidAmount: 0     },
    { schoolId: IDs.schools.dps, studentId: IDs.students.ishaan, invoiceNo: 'INV-2025-0006', amount: 12000, dueDate: new Date('2025-04-15'), status: 'paid',    paidAmount: 12000 },
    { schoolId: IDs.schools.dps, studentId: IDs.students.ishaan, invoiceNo: 'INV-2025-0007', amount: 12000, dueDate: new Date('2025-05-15'), status: 'unpaid',  paidAmount: 0     },
    { schoolId: IDs.schools.dps, studentId: IDs.students.diya,   invoiceNo: 'INV-2025-0008', amount: 18000, dueDate: new Date('2025-05-15'), status: 'partial', paidAmount: 10000 },
  ];
  for (const inv of invoices) {
    await prisma.feeInvoice.upsert({
      where: { schoolId_invoiceNo: { schoolId: inv.schoolId, invoiceNo: inv.invoiceNo } },
      update: {},
      create: inv,
    });
  }

  // 12. Announcements
  console.log('  → Announcements');
  const announcements = [
    { schoolId: IDs.schools.dps, title: 'Annual Sports Day',        content: 'Annual Sports Day will be held on 20th March 2026. All students are requested to participate actively.',             targetRoles: ['all'],     priority: 'normal', createdBy: IDs.users.dpsAdmin },
    { schoolId: IDs.schools.dps, title: 'Fee Payment Reminder',     content: 'Monthly fees for March 2026 are due by 15th March. Please ensure timely payment to avoid late charges.',             targetRoles: ['parent'],  priority: 'high',   createdBy: IDs.users.dpsAdmin },
    { schoolId: IDs.schools.dps, title: 'Parent-Teacher Meeting',   content: 'PTM scheduled for 22nd March 2026, 10 AM - 1 PM. Attendance of all parents is mandatory.',                          targetRoles: ['parent'],  priority: 'normal', createdBy: IDs.users.dpsAdmin },
    { schoolId: IDs.schools.dps, title: 'Holi Holiday',             content: 'School will remain closed on 14th March (Friday) for Holi celebrations. Classes resume on 17th March (Monday).',   targetRoles: ['all'],     priority: 'normal', createdBy: IDs.users.dpsAdmin },
  ];
  for (const ann of announcements) {
    await prisma.announcement.create({ data: ann }).catch(() => {});
  }

  // 13. Homework
  console.log('  → Homework');
  const now = new Date();
  const hwList = [
    { schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, teacherId: IDs.teachers.priya, subject: 'Mathematics', title: 'Chapter 5 - Fractions Exercise',  description: 'Complete exercises 5.1 to 5.3 from the textbook. Show all working.',                   dueDate: new Date(now.getTime() + 3 * 86400000) },
    { schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, teacherId: IDs.teachers.priya, subject: 'Science',     title: 'Plant Cell Diagram',               description: 'Draw and label a plant cell diagram. Use colored pencils.',                            dueDate: new Date(now.getTime() + 2 * 86400000) },
    { schoolId: IDs.schools.dps, classId: IDs.classes.dps5B, teacherId: IDs.teachers.amit,  subject: 'English',     title: 'Essay Writing',                    description: 'Write a 300-word essay on "My Favorite Festival". Use at least 3 paragraphs.',      dueDate: new Date(now.getTime() + 5 * 86400000) },
    { schoolId: IDs.schools.dps, classId: IDs.classes.dps5A, teacherId: IDs.teachers.amit,  subject: 'Social Studies', title: 'Map Work - India Rivers',       description: 'Mark and label the major rivers of India on the given outline map.',                  dueDate: new Date(now.getTime() - 1 * 86400000) },
  ];
  for (const hw of hwList) {
    await prisma.homework.create({ data: hw }).catch(() => {});
  }

  // 14. Transport Routes
  console.log('  → Transport Routes');
  await prisma.transportRoute.upsert({
    where: { id: '70000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '70000000-0000-0000-0000-000000000001', schoolId: IDs.schools.dps, name: 'Sector 45-56 Route', vehicleNo: 'DL-01-AB-1234', driverName: 'Ramesh Kumar', driverPhone: '+91-9876543210', capacity: 40 },
  });
  await prisma.transportRoute.upsert({
    where: { id: '70000000-0000-0000-0000-000000000002' },
    update: {},
    create: { id: '70000000-0000-0000-0000-000000000002', schoolId: IDs.schools.dps, name: 'Sector 22-30 Route', vehicleNo: 'DL-01-CD-5678', driverName: 'Suresh Yadav',  driverPhone: '+91-9876543211', capacity: 35 },
  });

  // 15. Vendor profile
  console.log('  → Vendor');
  await prisma.vendor.upsert({
    where: { userId: IDs.users.vendor },
    update: {},
    create: { id: IDs.vendor, userId: IDs.users.vendor, companyName: 'SchoolMart Supplies Pvt. Ltd.', gstNo: '07AABCS1429B1Z1', address: 'Plot 14, Industrial Area Phase 2, New Delhi - 110020' },
  });

  // 16. Vendor Inventory
  console.log('  → Vendor Inventory');
  const inventoryItems = [
    { name: 'NCERT Mathematics Grade 5',    category: 'books',      description: 'NCERT prescribed Mathematics textbook for Grade 5, latest edition 2025-26', price: 180,  quantity: 200, unit: 'piece', status: 'available'    },
    { name: 'NCERT Science Grade 5',        category: 'books',      description: 'NCERT prescribed Science textbook for Grade 5, latest edition 2025-26',      price: 160,  quantity: 200, unit: 'piece', status: 'available'    },
    { name: 'School Uniform Shirt (White)', category: 'uniform',    description: 'Official school uniform white shirt with school logo embroidered.',           price: 350,  quantity: 500, unit: 'piece', status: 'available'    },
    { name: 'School Uniform Trousers',      category: 'uniform',    description: 'Official school uniform navy blue trousers. Sizes XS to XXL available.',     price: 450,  quantity: 400, unit: 'piece', status: 'available'    },
    { name: 'School ID Lanyard',            category: 'lanyard',    description: 'Branded school ID lanyard with retractable badge holder.',                    price: 75,   quantity: 600, unit: 'piece', status: 'available'    },
    { name: 'Stationery Kit (Complete)',    category: 'stationery', description: 'Complete stationery kit including pencil box, 12 pencils, ruler, eraser.',    price: 299,  quantity: 150, unit: 'set',   status: 'available'    },
    { name: 'Sports Kit Bag',              category: 'sports',     description: 'Branded school sports bag with separate shoe compartment.',                    price: 599,  quantity: 80,  unit: 'piece', status: 'available'    },
    { name: 'Water Bottle (Steel)',         category: 'other',      description: 'BPA-free stainless steel insulated water bottle with school logo. 750ml.',    price: 349,  quantity: 0,   unit: 'piece', status: 'out_of_stock' },
  ];
  for (const item of inventoryItems) {
    await prisma.vendorInventory.create({
      data: { ...item, vendorId: IDs.vendor, schoolId: IDs.schools.dps },
    }).catch(() => {});
  }

  // 17. Consultants
  console.log('  → Consultants');
  await prisma.consultant.upsert({
    where: { userId: IDs.users.consultant },
    update: {},
    create: { id: IDs.consultants.meera, userId: IDs.users.consultant, specialization: 'Career Counselling & Higher Education', bio: 'Dr. Meera Iyer is a certified career counsellor with 12 years of experience.', qualifications: 'Ph.D. in Educational Psychology, M.A. Career Counselling', experienceYears: 12 },
  });
  await prisma.consultant.upsert({
    where: { userId: IDs.users.expiredConsultant },
    update: {},
    create: { id: IDs.consultants.rahul, userId: IDs.users.expiredConsultant, specialization: 'College Admissions & Scholarship Guidance', bio: 'Rahul Bose specializes in helping students secure admissions to top colleges.', qualifications: 'MBA, B.Tech, Certified College Admissions Counsellor', experienceYears: 8 },
  });

  // 18. Consultant Contracts
  console.log('  → Consultant Contracts');
  await prisma.consultantContract.create({
    data: { consultantId: IDs.consultants.meera, schoolId: IDs.schools.dps, contractNo: 'CON-DPS-2025-001', startDate: new Date('2025-01-01'), endDate: new Date('2026-12-31'), contractValue: 120000, status: 'active' },
  }).catch(() => {});
  await prisma.consultantContract.create({
    data: { consultantId: IDs.consultants.rahul, schoolId: IDs.schools.dps, contractNo: 'CON-DPS-2024-001', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), contractValue: 80000, status: 'expired' },
  }).catch(() => {});

  // 19. Consultant Sessions
  console.log('  → Consultant Sessions');
  const sessions = [
    { consultantId: IDs.consultants.meera, schoolId: IDs.schools.dps, title: 'Choosing the Right Stream After Grade 10', description: 'A comprehensive session covering Science, Commerce, and Arts streams.', sessionType: 'webinar',  targetGrades: ['Grade 9', 'Grade 10'], sessionDate: new Date(Date.now() + 7  * 86400000), durationMinutes: 90,  maxParticipants: 100, status: 'scheduled' },
    { consultantId: IDs.consultants.meera, schoolId: IDs.schools.dps, title: 'Engineering vs Medical: Myths & Realities', description: 'Debunking common myths about engineering and medical careers.', sessionType: 'workshop', targetGrades: ['Grade 11', 'Grade 12'], sessionDate: new Date(Date.now() + 14 * 86400000), durationMinutes: 120, maxParticipants: 60,  status: 'scheduled' },
    { consultantId: IDs.consultants.meera, schoolId: IDs.schools.dps, title: 'Resume Building & Interview Skills Workshop', description: 'Hands-on workshop teaching students how to build an impressive resume.', sessionType: 'workshop', targetGrades: ['Grade 12'], sessionDate: new Date(Date.now() - 10 * 86400000), durationMinutes: 180, maxParticipants: 40,  status: 'completed' },
  ];
  for (const s of sessions) {
    await prisma.consultantSession.create({ data: s }).catch(() => {});
  }

  // School Location Master
  console.log('  → School Location Master');
  const dpsIndia    = await prisma.countryMaster.findFirst({ where: { schoolId: IDs.schools.dps,    code: 'IND' } });
  const dpsHaryana  = await prisma.stateMaster.findFirst({  where: { schoolId: IDs.schools.dps,    code: 'HR'  } });
  const stmIndia    = await prisma.countryMaster.findFirst({ where: { schoolId: IDs.schools.stmary, code: 'IND' } });
  const stmMaharashtra = await prisma.stateMaster.findFirst({ where: { schoolId: IDs.schools.stmary, code: 'MH' } });
  await prisma.schoolLocationMaster.upsert({
    where: { id: 'sl000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'sl000001-0000-0000-0000-000000000001',
      schoolId: IDs.schools.dps,
      address:  '123 Education Lane, Sector 45, Gurugram',
      city:     'Gurugram',
      pincode:  '122003',
      countryId: dpsIndia?.id,
      stateId:   dpsHaryana?.id,
    },
  });
  await prisma.schoolLocationMaster.upsert({
    where: { id: 'sl000002-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'sl000002-0000-0000-0000-000000000001',
      schoolId: IDs.schools.stmary,
      address:  '456 Heritage Road, Bandra, Mumbai',
      city:     'Mumbai',
      pincode:  '400050',
      countryId: stmIndia?.id,
      stateId:   stmMaharashtra?.id,
    },
  });

  // School Hierarchy Master
  console.log('  → School Hierarchy Master');
  const dpsTrustId     = 'sh000001-0000-0000-0000-000000000001';
  const dpsSchoolId    = 'sh000001-0000-0000-0000-000000000002';
  const dpsPrimaryId   = 'sh000001-0000-0000-0000-000000000003';
  const dpsSecondaryId = 'sh000001-0000-0000-0000-000000000004';
  await prisma.schoolHierarchyMaster.upsert({ where: { id: dpsTrustId },     update: {}, create: { id: dpsTrustId,     schoolId: IDs.schools.dps, name: 'DPS Society Trust',       level: 1, parentId: null        } });
  await prisma.schoolHierarchyMaster.upsert({ where: { id: dpsSchoolId },    update: {}, create: { id: dpsSchoolId,    schoolId: IDs.schools.dps, name: 'DPS Sector 45',           level: 2, parentId: dpsTrustId  } });
  await prisma.schoolHierarchyMaster.upsert({ where: { id: dpsPrimaryId },   update: {}, create: { id: dpsPrimaryId,   schoolId: IDs.schools.dps, name: 'Primary Wing (1–5)',      level: 3, parentId: dpsSchoolId } });
  await prisma.schoolHierarchyMaster.upsert({ where: { id: dpsSecondaryId }, update: {}, create: { id: dpsSecondaryId, schoolId: IDs.schools.dps, name: 'Secondary Wing (6–10)',   level: 3, parentId: dpsSchoolId } });

  // Exam Type Master + Grading Type Master
  console.log('  → Exam Type Master');
  const examTypes = [
    { id: 'et000001-0000-0000-0000-000000000001', schoolId: IDs.schools.dps,    name: 'Unit Test 1',  code: 'ut1',    termOrder: 1 },
    { id: 'et000001-0000-0000-0000-000000000002', schoolId: IDs.schools.dps,    name: 'Mid Term',     code: 'mid',    termOrder: 2 },
    { id: 'et000001-0000-0000-0000-000000000003', schoolId: IDs.schools.dps,    name: 'Unit Test 2',  code: 'ut2',    termOrder: 3 },
    { id: 'et000001-0000-0000-0000-000000000004', schoolId: IDs.schools.dps,    name: 'Annual',       code: 'annual', termOrder: 4 },
    { id: 'et000002-0000-0000-0000-000000000001', schoolId: IDs.schools.stmary, name: 'Term 1',       code: 'term1',  termOrder: 1 },
    { id: 'et000002-0000-0000-0000-000000000002', schoolId: IDs.schools.stmary, name: 'Term 2',       code: 'term2',  termOrder: 2 },
  ];
  for (const et of examTypes) {
    await prisma.examTypeMaster.upsert({ where: { schoolId_code: { schoolId: et.schoolId, code: et.code } }, update: {}, create: et });
  }

  console.log('  → Grading Type Master');
  const gradingRows = [
    { schoolId: IDs.schools.dps, examTypeId: 'et000001-0000-0000-0000-000000000001', grade: 'A+', minPercent: 90, maxPercent: 100, gradePoints: 10.0, description: 'Outstanding'  },
    { schoolId: IDs.schools.dps, examTypeId: 'et000001-0000-0000-0000-000000000001', grade: 'A',  minPercent: 80, maxPercent: 89,  gradePoints: 9.0,  description: 'Excellent'    },
    { schoolId: IDs.schools.dps, examTypeId: 'et000001-0000-0000-0000-000000000001', grade: 'B+', minPercent: 70, maxPercent: 79,  gradePoints: 8.0,  description: 'Very Good'    },
    { schoolId: IDs.schools.dps, examTypeId: 'et000001-0000-0000-0000-000000000001', grade: 'B',  minPercent: 60, maxPercent: 69,  gradePoints: 7.0,  description: 'Good'         },
    { schoolId: IDs.schools.dps, examTypeId: 'et000001-0000-0000-0000-000000000001', grade: 'C',  minPercent: 50, maxPercent: 59,  gradePoints: 6.0,  description: 'Average'      },
    { schoolId: IDs.schools.dps, examTypeId: 'et000001-0000-0000-0000-000000000001', grade: 'D',  minPercent: 33, maxPercent: 49,  gradePoints: 5.0,  description: 'Pass'         },
    { schoolId: IDs.schools.dps, examTypeId: 'et000001-0000-0000-0000-000000000001', grade: 'F',  minPercent: 0,  maxPercent: 32,  gradePoints: 0.0,  description: 'Fail'         },
  ];
  for (const gr of gradingRows) {
    await prisma.gradingTypeMaster.upsert({
      where: { schoolId_examTypeId_grade: { schoolId: gr.schoolId, examTypeId: gr.examTypeId, grade: gr.grade } },
      update: {},
      create: gr,
    });
  }

  // Announcement Type Master
  console.log('  → Announcement Type Master');
  const announcementTypes = [
    { schoolId: IDs.schools.dps,    name: 'Academic',    code: 'academic'    },
    { schoolId: IDs.schools.dps,    name: 'Fee',         code: 'fee'         },
    { schoolId: IDs.schools.dps,    name: 'Holiday',     code: 'holiday'     },
    { schoolId: IDs.schools.dps,    name: 'Event',       code: 'event'       },
    { schoolId: IDs.schools.dps,    name: 'General',     code: 'general'     },
    { schoolId: IDs.schools.stmary, name: 'Academic',    code: 'academic'    },
    { schoolId: IDs.schools.stmary, name: 'General',     code: 'general'     },
  ];
  for (const at of announcementTypes) {
    await prisma.announcementTypeMaster.upsert({
      where:  { schoolId_code: { schoolId: at.schoolId, code: at.code } },
      update: {},
      create: at,
    });
  }

  // Leave Type Master (verify / seed defaults)
  console.log('  → Leave Type Master (defaults)');
  const leaveTypes = [
    { schoolId: IDs.schools.dps, name: 'Sick Leave',       code: 'sick',      applicableTo: ['parent', 'teacher', 'employee'] },
    { schoolId: IDs.schools.dps, name: 'Casual Leave',     code: 'casual',    applicableTo: ['teacher', 'employee']           },
    { schoolId: IDs.schools.dps, name: 'Emergency Leave',  code: 'emergency', applicableTo: ['parent', 'teacher', 'employee'] },
    { schoolId: IDs.schools.dps, name: 'Maternity Leave',  code: 'maternity', applicableTo: ['teacher', 'employee']           },
    { schoolId: IDs.schools.dps, name: 'Other',            code: 'other',     applicableTo: ['parent', 'teacher', 'employee'] },
    { schoolId: IDs.schools.stmary, name: 'Sick Leave',    code: 'sick',      applicableTo: ['parent', 'teacher', 'employee'] },
    { schoolId: IDs.schools.stmary, name: 'Casual Leave',  code: 'casual',    applicableTo: ['teacher', 'employee']           },
    { schoolId: IDs.schools.stmary, name: 'Other',         code: 'other',     applicableTo: ['parent', 'teacher', 'employee'] },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveTypeMaster.upsert({
      where:  { schoolId_code: { schoolId: lt.schoolId, code: lt.code } },
      update: {},
      create: lt,
    });
  }

  // Content Type Master (sample additional fields for Admission Form)
  console.log('  → Content Type Master');
  const contentTypeRows = [
    { schoolId: IDs.schools.dps, formName: 'admission_form', fieldSlot: 'freetext_1', fieldType: 'text',     label: 'Previous School Name',    options: [],                                sortOrder: 1 },
    { schoolId: IDs.schools.dps, formName: 'admission_form', fieldSlot: 'freetext_2', fieldType: 'text',     label: 'Reason for Leaving',       options: [],                                sortOrder: 2 },
    { schoolId: IDs.schools.dps, formName: 'admission_form', fieldSlot: 'dropdown_1', fieldType: 'dropdown', label: 'Sibling in School',        options: ['Yes', 'No'],                     sortOrder: 3 },
    { schoolId: IDs.schools.dps, formName: 'admission_form', fieldSlot: 'dropdown_2', fieldType: 'dropdown', label: 'Transport Required',       options: ['Yes', 'No'],                     sortOrder: 4 },
    { schoolId: IDs.schools.dps, formName: 'admission_form', fieldSlot: 'dropdown_3', fieldType: 'dropdown', label: 'Category',                 options: ['General', 'OBC', 'SC', 'ST'],   sortOrder: 5 },
    { schoolId: IDs.schools.dps, formName: 'add_student_form', fieldSlot: 'freetext_1', fieldType: 'text',   label: 'Aadhaar Number',           options: [],                                sortOrder: 1 },
    { schoolId: IDs.schools.dps, formName: 'add_student_form', fieldSlot: 'dropdown_1', fieldType: 'dropdown', label: 'Nationality',            options: ['Indian', 'NRI', 'Foreign'],       sortOrder: 2 },
  ];
  for (const ct of contentTypeRows) {
    await prisma.contentTypeMaster.upsert({
      where:  { schoolId_formName_fieldSlot: { schoolId: ct.schoolId, formName: ct.formName, fieldSlot: ct.fieldSlot } },
      update: {},
      create: ct,
    });
  }

  console.log('\n✅ Seed data inserted successfully!');
  console.log('\n📝 Demo login credentials (password: password123):');
  console.log('   Super Admin:       superadmin@yulaa.ai');
  console.log('   School Admin:      admin@dps45.edu.in');
  console.log('   Teacher:           priya.teacher@dps45.edu.in');
  console.log('   Parent (2 kids):   parent.singh@gmail.com');
  console.log('   Vendor:            vendor@schoolmart.in');
  console.log('   Consultant:        consultant@careers.in');
  console.log('   Expired Consult.:  expired.consultant@careers.in  (login blocked)');
}

seed()
  .catch((e) => { console.error('❌ Error seeding:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
