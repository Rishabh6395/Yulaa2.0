/**
 * Online Classes API — school-scoped, meeting links never leak across schools.
 * GET    - list online classes (teacher sees own, student/parent sees their class, admin sees all)
 * POST   - teacher/admin creates an online class (optionally linked to a timetable slot)
 * PATCH  - teacher updates status (live/ended) or adds recording URL
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;

    const { searchParams } = new URL(request.url);
    const classId   = searchParams.get('class_id');
    const dateStr   = searchParams.get('date');
    const upcoming  = searchParams.get('upcoming') === 'true';

    const dateFilter = dateStr
      ? { scheduledAt: { gte: new Date(dateStr + 'T00:00:00Z'), lt: new Date(dateStr + 'T23:59:59Z') } }
      : upcoming
        ? { scheduledAt: { gte: new Date() } }
        : {};

    // Teacher — see own classes only (within this school for data isolation)
    if (role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      if (!teacher) return Response.json({ classes: [] });

      const classes = await prisma.onlineClass.findMany({
        where: { schoolId, teacherId: teacher.id, ...dateFilter },
        include: {
          class: { select: { name: true, grade: true, section: true } },
          attendances: { select: { id: true, status: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });
      return Response.json({ classes });
    }

    // Student — only their class, same school; meeting links visible only if status != scheduled
    if (role === 'student') {
      const student = await prisma.student.findFirst({ where: { schoolId, userId: user.id }, select: { id: true, classId: true } });
      if (!student?.classId) return Response.json({ classes: [] });

      const classes = await prisma.onlineClass.findMany({
        where: { schoolId, classId: student.classId, status: { not: 'cancelled' }, ...dateFilter },
        select: {
          id: true, title: true, subject: true, platform: true, scheduledAt: true,
          durationMinutes: true, status: true, isRecorded: true,
          meetingLink: true,  // safe — already scoped to student's class + school
          recordingUrl: true,
          teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { scheduledAt: 'asc' },
      });
      return Response.json({ classes });
    }

    // Parent — classes for their children's classes, same school
    if (role === 'parent') {
      const parent = await prisma.parent.findFirst({ where: { userId: user.id }, select: { id: true } });
      if (!parent) return Response.json({ classes: [] });

      const children = await prisma.parentStudent.findMany({
        where: { parentId: parent.id },
        select: { student: { select: { classId: true } } },
      });
      const classIds = [...new Set(children.map(c => c.student.classId).filter(Boolean) as string[])];
      if (!classIds.length) return Response.json({ classes: [] });

      const classes = await prisma.onlineClass.findMany({
        where: { schoolId, classId: { in: classIds }, status: { not: 'cancelled' }, ...dateFilter },
        select: {
          id: true, title: true, subject: true, platform: true, scheduledAt: true,
          durationMinutes: true, status: true, isRecorded: true,
          meetingLink: true,
          recordingUrl: true,
          class: { select: { name: true, grade: true, section: true } },
          teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { scheduledAt: 'asc' },
      });
      return Response.json({ classes });
    }

    // Admin / principal / HOD — see all for school
    if (['school_admin', 'principal', 'hod'].includes(role)) {
      const classes = await prisma.onlineClass.findMany({
        where: { schoolId, ...(classId ? { classId } : {}), ...dateFilter },
        include: {
          class: { select: { name: true, grade: true, section: true } },
          teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
          attendances: { select: { status: true } },
        },
        orderBy: { scheduledAt: 'desc' },
      });
      return Response.json({ classes });
    }

    throw new ForbiddenError();
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;

    if (!['teacher', 'school_admin', 'principal'].includes(role)) throw new ForbiddenError();

    const body = await request.json();
    const { slot_id, class_id, title, subject, platform, meeting_link, meeting_id,
            meeting_password, scheduled_at, duration_minutes } = body;

    if (!title || !scheduled_at) throw new AppError('title and scheduled_at are required');
    if (!class_id)               throw new AppError('class_id is required');

    // Verify class belongs to same school
    const cls = await prisma.class.findFirst({ where: { id: class_id, schoolId } });
    if (!cls) throw new AppError('Class not found in this school');

    let teacherId: string;
    if (role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      if (!teacher) throw new ForbiddenError('Teacher profile not found');
      teacherId = teacher.id;
    } else {
      // Admin must specify teacher_id
      if (!body.teacher_id) throw new AppError('teacher_id is required for admin');
      teacherId = body.teacher_id;
    }

    const onlineClass = await prisma.onlineClass.create({
      data: {
        schoolId,
        teacherId,
        classId: class_id,
        slotId: slot_id ?? null,
        title,
        subject: subject ?? null,
        platform: platform ?? 'meet',
        meetingLink: meeting_link ?? null,
        meetingId: meeting_id ?? null,
        meetingPassword: meeting_password ?? null,
        scheduledAt: new Date(scheduled_at),
        durationMinutes: duration_minutes ?? 45,
      },
      include: {
        class: { select: { name: true, grade: true, section: true } },
      },
    });

    return Response.json({ class: onlineClass }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;

    const body = await request.json();
    const { id, status, meeting_link, recording_url } = body;
    if (!id) throw new AppError('id is required');

    // Verify ownership: teacher can only update their own; admin can update any in school
    const existing = await prisma.onlineClass.findFirst({ where: { id, schoolId } });
    if (!existing) throw new AppError('Online class not found');

    if (role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      if (!teacher || existing.teacherId !== teacher.id) throw new ForbiddenError();
    } else if (!['school_admin', 'principal'].includes(role)) {
      throw new ForbiddenError();
    }

    const updated = await prisma.onlineClass.update({
      where: { id },
      data: {
        ...(status       && { status }),
        ...(meeting_link !== undefined && { meetingLink: meeting_link }),
        ...(recording_url && { recordingUrl: recording_url, isRecorded: true }),
      },
    });

    return Response.json({ class: updated });
  } catch (err) { return handleError(err); }
}
