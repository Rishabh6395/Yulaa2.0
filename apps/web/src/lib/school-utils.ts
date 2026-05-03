import prisma from './prisma';
import { AppError } from '@/utils/errors';

// Single source of truth for weekday → epoch-date encoding used in HolidayCalendar.
// Index == JS day-of-week number (0=Sun … 6=Sat).
export const WEEKOFF_EPOCH_DATES: readonly string[] = [
  '1970-01-04', // 0 Sunday
  '1970-01-05', // 1 Monday
  '1970-01-06', // 2 Tuesday
  '1970-01-07', // 3 Wednesday
  '1970-01-08', // 4 Thursday
  '1970-01-09', // 5 Friday
  '1970-01-10', // 6 Saturday
];

/** Returns 'YYYY-YYYY+1' for the Indian academic year (Apr–Mar) containing a UTC date. */
export function getAcademicYearLabel(date: Date): string {
  const y = date.getUTCMonth() >= 3 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return `${y}-${y + 1}`;
}

/** Returns the current academic year label based on today. */
export function currentAcademicYearLabel(): string {
  return getAcademicYearLabel(new Date());
}

/** Returns all unique academic year labels covering a UTC date range. */
export function getAcademicYearsForRange(start: Date, end: Date): string[] {
  const years = new Set<string>();
  const cur = new Date(start);
  while (cur <= end) {
    years.add(getAcademicYearLabel(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return [...years];
}

/**
 * Throws 403 unless the authenticated user (identified by userId) is a parent
 * who is linked to the given student via the ParentStudent join table.
 * Call this before returning any student-scoped data to a parent role.
 */
export async function assertParentOwnsStudent(userId: string, studentId: string): Promise<void> {
  const link = await prisma.parentStudent.findFirst({
    where: { studentId, parent: { userId } },
    select: { id: true },
  });
  if (!link) throw new AppError('Access denied: this student is not linked to your account', 403);
}

/**
 * Returns the schoolId for a student.
 * Throws 404 if the student does not exist.
 */
export async function getStudentSchoolId(studentId: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where:  { id: studentId },
    select: { schoolId: true },
  });
  if (!student) throw new AppError('Student not found', 404);
  return student.schoolId;
}

/** Loads weekoff day numbers (0–6) from the school's HolidayCalendar config. */
export async function getSchoolWeekoffDays(schoolId: string): Promise<number[]> {
  const entries = await prisma.holidayCalendar.findMany({
    where:  { schoolId, academicYear: '_weekoff_' },
    select: { date: true },
  });
  if (entries.length === 0) return [0, 6];
  return entries
    .map(w => WEEKOFF_EPOCH_DATES.indexOf(new Date(w.date).toISOString().split('T')[0]))
    .filter(d => d >= 0);
}
