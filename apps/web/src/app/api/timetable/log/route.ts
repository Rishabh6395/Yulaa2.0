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
    // For teachers: filter by their slots only
    if (primary.role_code === 'teacher') {
      where.teacherId = user.id;
    } else if (schoolId) {
      where.slot = { timetable: { schoolId } };
    }

    const logs = await prisma.timetableLog.findMany({
      where,
      include: { slot: { select: { subject: true, dayOfWeek: true, startTime: true, endTime: true } } },
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
    const { slotId, date, topic, notes, homeworkId } = body;
    if (!slotId || !date || !topic) throw new AppError('slotId, date, topic required');

    const log = await prisma.timetableLog.upsert({
      where: { slotId_date: { slotId, date: new Date(date) } },
      update: { topic, notes: notes || null, homeworkId: homeworkId || null, teacherId: user.id },
      create: { slotId, date: new Date(date), topic, notes: notes || null, homeworkId: homeworkId || null, teacherId: user.id },
    });
    return Response.json({ log }, { status: 201 });
  } catch (err) { return handleError(err); }
}
