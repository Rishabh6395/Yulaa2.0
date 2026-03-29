import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

// Returns the attendance mode configured for the logged-in user's school
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const schoolId = primary?.school_id;
    if (!schoolId) return Response.json({ attendanceMode: 'class' });
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { attendanceMode: true },
    });
    return Response.json({ attendanceMode: school?.attendanceMode ?? 'class' });
  } catch (err) { return handleError(err); }
}
