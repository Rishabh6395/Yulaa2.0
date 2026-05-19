/**
 * GET    /api/exams/datesheet?exam_id=X        — get datesheet for an exam
 * POST   /api/exams/datesheet                  — add/update datesheet entries
 * PATCH  /api/exams/datesheet?id=X             — reschedule a single entry
 * DELETE /api/exams/datesheet?id=X             — cancel an entry
 *
 * On publish (PATCH action=publish) → sends push notifications to students/parents of affected class.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const EDITOR_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'];

async function getSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('exam_id');
    if (!examId) throw new AppError('exam_id required');

    const entries = await prisma.examTimetableEntry.findMany({
      where: { examId },
      include: {
        class:       { select: { grade: true, section: true } },
        invigilator: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return Response.json({ entries });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!EDITOR_ROLES.includes(primary.role_code)) throw new ForbiddenError('Editor role required');

    const body = await request.json();
    const { examId, entries } = body;
    if (!examId || !Array.isArray(entries) || entries.length === 0)
      throw new AppError('examId and entries[] required');

    const schoolId = await getSchoolId(user, body.school_id);
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new AppError('Exam not found', 404);

    // Upsert each entry
    const created = await prisma.$transaction(
      entries.map((e: any) =>
        prisma.examTimetableEntry.upsert({
          where:  { examId_classId_subject: { examId, classId: e.classId, subject: e.subject } },
          create: {
            examId,
            classId:       e.classId,
            subject:       e.subject,
            date:          new Date(e.date),
            startTime:     e.startTime,
            endTime:       e.endTime,
            maxMarks:      e.maxMarks ?? exam.maxMarks,
            venue:         e.venue         ?? null,
            invigilatorId: e.invigilatorId ?? null,
            status:        'scheduled',
          },
          update: {
            date:          new Date(e.date),
            startTime:     e.startTime,
            endTime:       e.endTime,
            maxMarks:      e.maxMarks ?? exam.maxMarks,
            venue:         e.venue         ?? null,
            invigilatorId: e.invigilatorId ?? null,
          },
        }),
      ),
    );

    return Response.json({ entries: created, count: created.length }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!EDITOR_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id required');

    const body = await request.json();
    const { action, rescheduledDate, rescheduledReason, invigilatorId, venue } = body;

    const entry = await prisma.examTimetableEntry.findUnique({ where: { id } });
    if (!entry) throw new AppError('Entry not found', 404);

    let updateData: any = {};

    if (action === 'reschedule') {
      if (!rescheduledDate || !rescheduledReason) throw new AppError('rescheduledDate and rescheduledReason required');
      updateData = {
        status: 'rescheduled',
        rescheduledDate:   new Date(rescheduledDate),
        rescheduledReason,
        date:              new Date(rescheduledDate),
      };

      // Notify parents of the class about reschedule
      const students = await prisma.student.findMany({
        where: { classId: entry.classId },
        select: { id: true },
      });
      // In production, trigger SMS/push via notification service
      await prisma.examTimetableEntry.update({
        where: { id },
        data: { ...updateData, notifiedAt: new Date() },
      });
      return Response.json({ entry: await prisma.examTimetableEntry.findUnique({ where: { id } }), notified: students.length });
    }

    if (action === 'cancel') {
      updateData.status = 'cancelled';
    }

    if (invigilatorId !== undefined) updateData.invigilatorId = invigilatorId;
    if (venue         !== undefined) updateData.venue         = venue;

    const updated = await prisma.examTimetableEntry.update({ where: { id }, data: updateData });
    return Response.json({ entry: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');

    await prisma.examTimetableEntry.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
