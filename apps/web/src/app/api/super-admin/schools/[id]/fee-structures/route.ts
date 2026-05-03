import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function assertSuperAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r: any) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const structures = await prisma.feeStructure.findMany({
      where:    { schoolId: params.id },
      select:   { name: true },
      distinct: ['name'],
      orderBy:  { name: 'asc' },
    });
    return Response.json({ names: structures.map((s) => s.name) });
  } catch (err) { return handleError(err); }
}
