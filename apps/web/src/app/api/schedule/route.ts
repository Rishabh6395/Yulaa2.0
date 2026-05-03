import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { currentAcademicYearLabel } from '@/lib/school-utils';

const ALLOWED = ['super_admin', 'school_admin', 'principal'];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED.includes(primaryRole.role_code)) throw new ForbiddenError();

    const schoolId = primaryRole.school_id!;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    if (!classId) return Response.json({ slots: [] });

    const timetable = await prisma.timetable.findUnique({
      where: { schoolId_classId_academicYear: { schoolId, classId, academicYear: currentAcademicYearLabel() } },
      include: {
        slots: {
          include: { teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
        },
      },
    });

    return Response.json({ slots: timetable?.slots ?? [] });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED.includes(primaryRole.role_code)) throw new ForbiddenError();

    const schoolId = primaryRole.school_id!;
    const { classId, slots } = await request.json();
    if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

    const timetable = await prisma.timetable.upsert({
      where: { schoolId_classId_academicYear: { schoolId, classId, academicYear: currentAcademicYearLabel() } },
      update:  { isActive: true },
      create:  { schoolId, classId, academicYear: currentAcademicYearLabel(), isActive: true },
    });

    await prisma.timetableSlot.deleteMany({ where: { timetableId: timetable.id } });

    const validSlots = (slots as any[]).filter(s => s.subject || s.teacherId);
    if (validSlots.length > 0) {
      await prisma.timetableSlot.createMany({
        data: validSlots.map((s: any) => ({
          timetableId: timetable.id,
          dayOfWeek:   s.dayOfWeek,
          periodNo:    s.periodNo,
          startTime:   s.startTime || '',
          endTime:     s.endTime   || '',
          subject:     s.subject   || '',
          teacherId:   s.teacherId || null,
        })),
      });
    }

    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
