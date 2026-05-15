import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const school = await prisma.school.findUnique({
      where: { id: (await params).id },
      select: { attendanceMode: true },
    });
    return Response.json({ attendanceMode: school?.attendanceMode ?? 'class' });
  } catch (err) { return handleError(err); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (primary.role_code !== 'super_admin') throw new ForbiddenError();
    const { attendanceMode } = await request.json();
    if (!['class', 'daily', 'card', 'face'].includes(attendanceMode)) {
      return Response.json({ error: 'Invalid attendance mode' }, { status: 400 });
    }
    await prisma.school.update({ where: { id: (await params).id }, data: { attendanceMode } });
    return Response.json({ ok: true, attendanceMode });
  } catch (err) { return handleError(err); }
}
