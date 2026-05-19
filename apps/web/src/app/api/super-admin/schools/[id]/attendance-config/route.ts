import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const school = await prisma.school.findUnique({
      where: { id: (await params).id },
      select: { attendanceMode: true, attendancePunchEnabled: true },
    });
    return Response.json({
      attendanceMode:         school?.attendanceMode         ?? 'class',
      attendancePunchEnabled: school?.attendancePunchEnabled ?? false,
    });
  } catch (err) { return handleError(err); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError();

    const body = await request.json();
    const { attendanceMode, attendancePunchEnabled } = body;

    const data: Record<string, unknown> = {};
    if (attendanceMode !== undefined) {
      if (!['class', 'daily', 'card', 'face'].includes(attendanceMode)) {
        return Response.json({ error: 'Invalid attendance mode' }, { status: 400 });
      }
      data.attendanceMode = attendanceMode;
    }
    if (attendancePunchEnabled !== undefined) {
      data.attendancePunchEnabled = Boolean(attendancePunchEnabled);
    }

    await prisma.school.update({ where: { id: (await params).id }, data });
    return Response.json({ ok: true, ...data });
  } catch (err) { return handleError(err); }
}
