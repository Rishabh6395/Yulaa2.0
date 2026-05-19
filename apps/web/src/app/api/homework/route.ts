import { REVIEWER_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { listHomework, createHomework, updateHomework } from '@/modules/homework/homework.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const schoolId    = primaryRole.school_id!;
    const { searchParams } = new URL(request.url);
    const scopedParams = new URLSearchParams(searchParams);

    // Teachers/class_teachers see only their own class's homework
    if (primaryRole.role_code === 'teacher' || primaryRole.role_code === 'class_teacher') {
      const teacherRecord = await prisma.teacher.findFirst({ where: { userId: user.id, schoolId } });
      if (teacherRecord?.classId) {
        scopedParams.set('class_id', teacherRecord.classId);
      } else if (teacherRecord) {
        // Fallback: find class where this teacher is assigned via TimetableSlot
        const slot = await prisma.timetableSlot.findFirst({
          where: { teacherId: teacherRecord.id, timetable: { schoolId, isActive: true } },
          include: { timetable: { select: { classId: true } } },
        });
        if (slot?.timetable?.classId) scopedParams.set('class_id', slot.timetable.classId);
      }
    }

    return Response.json(await listHomework(schoolId, scopedParams));
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Only teachers and admins can create homework');
    const homework    = await createHomework(primaryRole.school_id!, user.id, await request.json());
    return Response.json({ homework }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user        = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const body        = await request.json();

    // parent/student marking done or adding a note is a separate action path
    const isParentStudentAction = body.student_id && (body.done_status !== undefined || body.parent_note !== undefined);
    if (!isParentStudentAction && !REVIEWER_ROLES.includes(primaryRole.role_code)) {
      throw new ForbiddenError('Only teachers and admins can edit homework');
    }

    const homework = await updateHomework(body);
    return Response.json({ homework });
  } catch (err) { return handleError(err); }
}
