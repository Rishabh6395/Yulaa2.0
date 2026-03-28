import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const schoolId    = primaryRole.school_id;
    if (!schoolId) return Response.json({ subjects: [] });

    const teacher = await prisma.teacher.findUnique({
      where: { userId_schoolId: { userId: user.id, schoolId } },
    });
    if (!teacher) return Response.json({ subjects: [] });

    // Get distinct subjects from timetable slots assigned to this teacher
    const slots = await prisma.timetableSlot.findMany({
      where:  { teacherId: teacher.id, subject: { not: '' } },
      select: { subject: true },
      distinct: ['subject'],
    });

    const subjects = slots.map((s) => s.subject).filter(Boolean).sort();
    return Response.json({ subjects });
  } catch (err) { return handleError(err); }
}
