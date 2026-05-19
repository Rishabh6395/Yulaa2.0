import { REVIEWER_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { listSubmissions } from '@/modules/homework/homework.service';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Only teachers and admins can view submissions');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ?? '';
    if (!id) throw new AppError('id is required');
    // Verify homework belongs to the caller's school
    const hw = await prisma.homework.findFirst({ where: { id, schoolId: primaryRole.school_id! }, select: { id: true } });
    if (!hw) throw new AppError('Homework not found', 404);
    const submissions = await listSubmissions(id);
    return Response.json({ submissions });
  } catch (err) { return handleError(err); }
}
