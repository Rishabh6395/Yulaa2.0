import prisma from '@/lib/prisma';
import type { MarkAttendanceInput } from './attendance.types';

export async function findMonthlyAttendance(schoolId: string, studentId: string, firstDay: Date, lastDay: Date) {
  return prisma.attendance.findMany({
    where: { schoolId, studentId, date: { gte: firstDay, lte: lastDay } },
    select: { date: true, status: true, subjectAttendance: true, remarks: true },
    orderBy: { date: 'asc' },
  });
}

export async function findClassAttendanceForDate(schoolId: string, classId: string, date: Date) {
  return prisma.student.findMany({
    where: { schoolId, classId, status: 'active' },
    select: {
      id: true, firstName: true, lastName: true, admissionNo: true,
      attendance: {
        where: { schoolId, date },
        select: { id: true, status: true, remarks: true, subjectAttendance: true },
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
  records: Array<{ student_id: string; status: string; remarks?: string; date: Date; subjectAttendance?: Record<string, string> }>,
) {
  return Promise.all(
    records.map((r) =>
      prisma.attendance.upsert({
        where:  { studentId_date: { studentId: r.student_id, date: r.date } },
        create: { schoolId, studentId: r.student_id, classId, date: r.date, status: r.status, markedBy, updatedBy: markedBy, remarks: r.remarks ?? null, subjectAttendance: r.subjectAttendance ?? undefined },
        update: { status: r.status, updatedBy: markedBy, remarks: r.remarks ?? null, ...(r.subjectAttendance !== undefined && { subjectAttendance: r.subjectAttendance }) },
      })
    )
  );
}

// ── Employee (teacher) attendance ────────────────────────────────────────────

export async function findTeacherMonthlyAttendance(teacherId: string, firstDay: Date, lastDay: Date) {
  return prisma.attendance.findMany({
    where: { teacherId, studentId: null, date: { gte: firstDay, lte: lastDay } },
    select: { id: true, date: true, status: true, punchInTime: true, punchOutTime: true },
    orderBy: { date: 'asc' },
  });
}

export async function findTeacherTodayAttendance(teacherId: string, date: Date) {
  return prisma.attendance.findFirst({
    where: { teacherId, studentId: null, date },
    select: { id: true, status: true, punchInTime: true, punchOutTime: true },
  });
}

export async function findAllTeachersAttendanceForDate(schoolId: string, date: Date) {
  return prisma.teacher.findMany({
    where: { schoolId, status: 'active' },
    select: {
      id: true,
      employeeId: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      attendance: {
        where: { date, studentId: null },
        select: { id: true, status: true, punchInTime: true, punchOutTime: true },
      },
    },
    orderBy: { user: { firstName: 'asc' } },
  });
}

export async function findAllTeachersMonthlyAttendance(schoolId: string, firstDay: Date, lastDay: Date) {
  return prisma.teacher.findMany({
    where: { schoolId, status: 'active' },
    select: {
      id: true,
      employeeId: true,
      user: { select: { firstName: true, lastName: true } },
      attendance: {
        where: { studentId: null, date: { gte: firstDay, lte: lastDay } },
        select: { date: true, status: true, punchInTime: true, punchOutTime: true },
        orderBy: { date: 'asc' },
      },
    },
    orderBy: { user: { firstName: 'asc' } },
  });
}

export async function upsertTeacherAttendance(
  schoolId: string,
  teacherId: string,
  markedBy: string,
  date: Date,
  status: string,
) {
  const existing = await prisma.attendance.findFirst({
    where: { teacherId, studentId: null, date },
  });
  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { status, updatedBy: markedBy },
    });
  }
  return prisma.attendance.create({
    data: { schoolId, teacherId, studentId: null, date, status, markedBy, updatedBy: markedBy },
  });
}

export async function punchTeacherAttendance(
  schoolId: string,
  teacherId: string,
  markedBy: string,
  date: Date,
  punchField: 'punchInTime' | 'punchOutTime',
  time: Date,
) {
  const existing = await prisma.attendance.findFirst({
    where: { teacherId, studentId: null, date },
  });
  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { [punchField]: time, status: 'present', updatedBy: markedBy },
    });
  }
  return prisma.attendance.create({
    data: {
      schoolId, teacherId, studentId: null, date,
      status: 'present', markedBy, updatedBy: markedBy,
      [punchField]: time,
    },
  });
}

export async function upsertAttendanceRecords(input: MarkAttendanceInput) {
  return Promise.all(
    input.records.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.student_id, date: input.date } },
        create: {
          schoolId:          input.schoolId,
          studentId:         r.student_id,
          classId:           input.classId,
          date:              input.date,
          status:            r.status,
          markedBy:          input.markedBy,
          updatedBy:         input.markedBy,
          remarks:           r.remarks || null,
          subjectAttendance: r.subjectAttendance ?? undefined,
        },
        update: {
          status:            r.status,
          updatedBy:         input.markedBy,
          remarks:           r.remarks || null,
          ...(r.subjectAttendance !== undefined && { subjectAttendance: r.subjectAttendance }),
        },
      })
    )
  );
}
