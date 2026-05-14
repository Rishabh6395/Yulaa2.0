import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function assertSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) throw new UnauthorizedError();
  const primary = (user.roles as any[]).find((r) => r.is_primary) ?? user.roles[0];
  if (primary.role_code !== 'super_admin') throw new ForbiddenError();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const { id } = await params;

    const school = await prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        allowExternalConsultant: true,
        allowExternalVendor: true,
      },
    });
    if (!school) throw new NotFoundError('School');

    return Response.json({ config: school });
  } catch (err) { return handleError(err); }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const { id } = await params;

    const existing = await prisma.school.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('School');

    const body = await request.json();
    const { allow_external_consultant, allow_external_vendor } = body;

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(allow_external_consultant !== undefined && { allowExternalConsultant: Boolean(allow_external_consultant) }),
        ...(allow_external_vendor !== undefined && { allowExternalVendor: Boolean(allow_external_vendor) }),
      },
      select: {
        id: true,
        name: true,
        allowExternalConsultant: true,
        allowExternalVendor: true,
      },
    });

    return Response.json({ config: updated });
  } catch (err) { return handleError(err); }
}
