import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
    });

    return Response.json({ profile });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const { first_name, last_name, phone } = body;

    if (!first_name?.trim() || !last_name?.trim()) {
      throw new AppError('First name and last name are required');
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: first_name.trim(),
        lastName:  last_name.trim(),
        phone:     phone?.trim() || null,
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    return Response.json({ profile: updated });
  } catch (err) { return handleError(err); }
}
