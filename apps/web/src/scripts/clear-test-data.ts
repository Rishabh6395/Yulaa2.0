/**
 * Clear all transactional/testing data while preserving:
 *   - Schools, Roles, Users, UserRoles
 *   - Teachers, Students, Parents, ParentStudents
 *   - Classes
 *   - Workflow configs (Leave, Admission workflows + steps)
 *   - Leave type masters, balance policies
 *   - Fee structures
 *   - Timetable + slots
 *   - Transport routes
 *   - Vendors, Consultants, Consultant contracts
 *
 * Run with:
 *   npx tsx src/scripts/clear-test-data.ts
 */

import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log('Starting test data cleanup...\n');

  // Order matters — children before parents (FK constraints)
  const steps: Array<{ label: string; fn: () => Promise<{ count: number }> }> = [
    { label: 'HomeworkSubmission',    fn: () => prisma.homeworkSubmission.deleteMany() },
    { label: 'Homework',              fn: () => prisma.homework.deleteMany() },
    { label: 'LeaveAction',           fn: () => prisma.leaveAction.deleteMany() },
    { label: 'LeaveRequest',          fn: () => prisma.leaveRequest.deleteMany() },
    { label: 'TeacherLeaveBalance',   fn: () => prisma.teacherLeaveBalance.deleteMany() },
    { label: 'StudentQuery',          fn: () => prisma.studentQuery.deleteMany() },
    { label: 'Attendance',            fn: () => prisma.attendance.deleteMany() },
    { label: 'FeePayment',            fn: () => prisma.feePayment.deleteMany() },
    { label: 'FeeInvoice',            fn: () => prisma.feeInvoice.deleteMany() },
    { label: 'Announcement',          fn: () => prisma.announcement.deleteMany() },
    { label: 'AdmissionAction',       fn: () => prisma.admissionAction.deleteMany() },
    { label: 'AdmissionChild',        fn: () => prisma.admissionChild.deleteMany() },
    { label: 'AdmissionApplication',  fn: () => prisma.admissionApplication.deleteMany() },
    { label: 'ComplianceDocument',    fn: () => prisma.complianceDocument.deleteMany() },
    { label: 'ComplianceItem',        fn: () => prisma.complianceItem.deleteMany() },
    { label: 'HolidayCalendar',       fn: () => prisma.holidayCalendar.deleteMany() },
    { label: 'OtpVerification',       fn: () => prisma.otpVerification.deleteMany() },
    { label: 'ConsultantSession',     fn: () => prisma.consultantSession.deleteMany() },
    { label: 'VendorInventory',       fn: () => prisma.vendorInventory.deleteMany() },
  ];

  let totalDeleted = 0;

  for (const step of steps) {
    try {
      const result = await step.fn();
      const n      = result.count;
      totalDeleted += n;
      if (n > 0) console.log(`  ✓ ${step.label.padEnd(25)} — ${n} row${n !== 1 ? 's' : ''} deleted`);
      else        console.log(`  · ${step.label.padEnd(25)} — nothing to delete`);
    } catch (err: any) {
      console.error(`  ✗ ${step.label} — ERROR: ${err.message}`);
    }
  }

  console.log(`\nDone. ${totalDeleted} total rows removed.`);
  console.log('Preserved: Schools, Roles, Users, UserRoles, Teachers, Students, Parents,');
  console.log('           Classes, Workflows, FeeStructures, Timetables, TransportRoutes,');
  console.log('           Vendors, Consultants, Contracts.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
