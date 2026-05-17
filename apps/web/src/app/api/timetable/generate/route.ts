/**
 * POST /api/timetable/generate
 * Body: { classId, academicYear, periodsPerDay, workingDays, subjects[] }
 *
 * Auto-generates a balanced timetable for a class:
 *   1. Reads available teachers for each subject (via TimetableSlot or Teacher subjects)
 *   2. Distributes periods evenly across working days
 *   3. Upserts TimetableSlot records
 *
 * subjects: [{ subject, teacherId, periodsPerWeek }]
 * workingDays: [1,2,3,4,5] (Mon–Fri, ISO day numbers)
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const PERIOD_TIMES = [
  { start: '08:00', end: '08:45' },
  { start: '08:45', end: '09:30' },
  { start: '09:30', end: '10:15' },
  { start: '10:30', end: '11:15' },  // after break
  { start: '11:15', end: '12:00' },
  { start: '12:00', end: '12:45' },
  { start: '13:30', end: '14:15' },  // after lunch
  { start: '14:15', end: '15:00' },
];

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal', 'hod'].includes(primary.role_code))
      throw new ForbiddenError('Admin role required');

    const body = await request.json();
    const { classId, academicYear, periodsPerDay = 8, workingDays = [1, 2, 3, 4, 5], subjects } = body;
    if (!classId || !subjects || !Array.isArray(subjects) || subjects.length === 0)
      throw new AppError('classId and subjects[] required');

    const schoolId: string = primary.school_id ?? body.schoolId;
    if (!schoolId) throw new AppError('school_id required');

    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw new AppError('Class not found', 404);

    // Find or create timetable
    let timetable = await prisma.timetable.findFirst({ where: { classId, schoolId, academicYear: academicYear ?? cls.academicYear } });
    if (!timetable) {
      timetable = await prisma.timetable.create({
        data: { classId, schoolId, academicYear: academicYear ?? cls.academicYear },
      });
    }

    // Build a slot pool: for each subject, repeat it periodsPerWeek times
    const pool: { subject: string; teacherId: string }[] = [];
    for (const s of subjects) {
      const count = s.periodsPerWeek ?? Math.floor((periodsPerDay * workingDays.length) / subjects.length);
      for (let i = 0; i < count; i++) pool.push({ subject: s.subject, teacherId: s.teacherId });
    }

    // Shuffle pool for random distribution
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Assign slots: iterate days × periods
    const slots: { dayOfWeek: number; periodNo: number; startTime: string; endTime: string; subject: string; teacherId: string }[] = [];
    let poolIdx = 0;
    for (const day of workingDays) {
      for (let p = 0; p < Math.min(periodsPerDay, PERIOD_TIMES.length); p++) {
        if (poolIdx >= pool.length) break;
        const times = PERIOD_TIMES[p];
        slots.push({ dayOfWeek: day, periodNo: p + 1, startTime: times.start, endTime: times.end, ...pool[poolIdx++] });
      }
    }

    // Upsert all slots
    const upserted = await prisma.$transaction(
      slots.map(s =>
        prisma.timetableSlot.upsert({
          where: { timetableId_dayOfWeek_periodNo: { timetableId: timetable!.id, dayOfWeek: s.dayOfWeek, periodNo: s.periodNo } },
          create: { timetableId: timetable!.id, dayOfWeek: s.dayOfWeek, periodNo: s.periodNo, startTime: s.startTime, endTime: s.endTime, subject: s.subject, teacherId: s.teacherId },
          update: { subject: s.subject, teacherId: s.teacherId, startTime: s.startTime, endTime: s.endTime },
        })
      )
    );

    return Response.json({ timetableId: timetable.id, slotsGenerated: upserted.length, slots: upserted });
  } catch (err) { return handleError(err); }
}
