import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const slotId = searchParams.get('slotId');
    const schoolId = primary.school_id;

    const where: any = {};
    if (slotId) { where.slotId = slotId; }
    if (date) { where.date = new Date(date); }
    if (primary.role_code === 'teacher') {
      where.teacherId = user.id;
    } else if (schoolId) {
      where.slot = { timetable: { schoolId } };
    }

    const logs = await prisma.timetableLog.findMany({
      where,
      include: {
        slot: { select: { subject: true, dayOfWeek: true, startTime: true, endTime: true } },
        homework: { select: { id: true, title: true, dueDate: true, description: true, maxMarks: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
    return Response.json({ logs });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['teacher', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { slotId, date, topic, notes, homework } = body;
    if (!slotId || !date || !topic) throw new AppError('slotId, date, topic required');

    let homeworkId: string | null = null;

    // If homework data provided, create or update the homework record
    if (homework?.title && homework?.dueDate) {
      const slot = await prisma.timetableSlot.findUnique({
        where: { id: slotId },
        include: { timetable: { select: { classId: true, schoolId: true } } },
      });
      if (!slot) throw new AppError('Slot not found');

      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.id, schoolId: slot.timetable.schoolId },
        select: { id: true },
      });
      if (!teacher) throw new AppError('Teacher profile not found');

      // Check if an existing log for this slot+date already has a homework, update it
      const existingLog = await prisma.timetableLog.findUnique({
        where: { slotId_date: { slotId, date: new Date(date) } },
        select: { homeworkId: true },
      });

      if (existingLog?.homeworkId && homework.update !== false) {
        // Update the existing homework
        await prisma.homework.update({
          where: { id: existingLog.homeworkId },
          data: {
            title:       homework.title,
            description: homework.description ?? null,
            dueDate:     new Date(homework.dueDate),
            maxMarks:    homework.maxMarks ? Number(homework.maxMarks) : null,
            subject:     slot.subject,
          },
        });
        homeworkId = existingLog.homeworkId;
      } else {
        // Create new homework
        const hw = await prisma.homework.create({
          data: {
            schoolId:    slot.timetable.schoolId,
            classId:     slot.timetable.classId,
            teacherId:   teacher.id,
            subject:     slot.subject,
            title:       homework.title,
            description: homework.description ?? null,
            dueDate:     new Date(homework.dueDate),
            maxMarks:    homework.maxMarks ? Number(homework.maxMarks) : null,
          },
        });
        homeworkId = hw.id;
      }
    }

    const log = await prisma.timetableLog.upsert({
      where: { slotId_date: { slotId, date: new Date(date) } },
      update: { topic, notes: notes || null, homeworkId: homeworkId ?? undefined, teacherId: user.id },
      create: { slotId, date: new Date(date), topic, notes: notes || null, homeworkId, teacherId: user.id },
      include: { homework: { select: { id: true, title: true, dueDate: true } } },
    });
    return Response.json({ log }, { status: 201 });
  } catch (err) { return handleError(err); }
}

// Update homework after it's been assigned (teacher can edit it later)
export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['teacher', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { homework_id, title, description, due_date, max_marks } = body;
    if (!homework_id) throw new AppError('homework_id required');

    const hw = await prisma.homework.update({
      where: { id: homework_id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(due_date    !== undefined && { dueDate: new Date(due_date) }),
        ...(max_marks   !== undefined && { maxMarks: max_marks ? Number(max_marks) : null }),
      },
    });
    return Response.json({ homework: hw });
  } catch (err) { return handleError(err); }
}
