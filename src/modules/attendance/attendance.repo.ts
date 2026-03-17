import prisma from '@/lib/prisma';
import type { MarkAttendanceInput } from './attendance.types';

export async function findMonthlyAttendance(studentId: string, firstDay: Date, lastDay: Date) {
  return prisma.attendance.findMany({
    where: { studentId, date: { gte: firstDay, lte: lastDay } },
    select: { date: true, status: true },
    orderBy: { date: 'asc' },
  });
}

export async function findClassAttendanceForDate(classId: string, date: Date) {
  return prisma.student.findMany({
    where: { classId, status: 'active' },
    select: {
      id: true, firstName: true, lastName: true, admissionNo: true,
      attendance: {
        where: { date },
        select: { id: true, status: true, remarks: true },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}

export async function findSchoolAttendanceSummary(schoolId: string, date: Date) {
  return prisma.class.findMany({
    where: { schoolId },
    select: {
      id: true, grade: true, section: true,
      attendance: { where: { date }, select: { status: true } },
    },
    orderBy: [{ grade: 'asc' }, { section: 'asc' }],
  });
}

export async function findClassStudentsForTemplate(classId: string) {
  return prisma.student.findMany({
    where: { classId, status: 'active' },
    select: { id: true, firstName: true, lastName: true, admissionNo: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}

export async function bulkUpsertAttendance(
  schoolId: string,
  classId: string,
  markedBy: string,
  records: Array<{ student_id: string; status: string; remarks?: string; date: Date }>,
) {
  return Promise.all(
    records.map((r) =>
      prisma.attendance.upsert({
        where:  { studentId_date: { studentId: r.student_id, date: r.date } },
        create: { schoolId, studentId: r.student_id, classId, date: r.date, status: r.status, markedBy, updatedBy: markedBy, remarks: r.remarks ?? null },
        update: { status: r.status, updatedBy: markedBy, remarks: r.remarks ?? null },
      })
    )
  );
}

export async function upsertAttendanceRecords(input: MarkAttendanceInput) {
  return Promise.all(
    input.records.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.student_id, date: input.date } },
        create: {
          schoolId:  input.schoolId,
          studentId: r.student_id,
          classId:   input.classId,
          date:      input.date,
          status:    r.status,
          markedBy:  input.markedBy,
          updatedBy: input.markedBy,
          remarks:   r.remarks || null,
        },
        update: {
          status:    r.status,
          updatedBy: input.markedBy,
          remarks:   r.remarks || null,
        },
      })
    )
  );
}
