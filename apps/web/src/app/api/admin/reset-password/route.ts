import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

// POST: admin resets a user's password
export async function POST(request: Request) {
  try {
    const actor   = await getUserFromRequest(request);
    if (!actor) throw new UnauthorizedError();
    const primary = actor.roles.find((r: any) => r.is_primary) ?? actor.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const { user_id, new_password } = await request.json();
    if (!user_id || !new_password) throw new AppError('user_id and new_password are required', 400);
    if (new_password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

    // For school_admin: verify the target user belongs to their school
    if (primary.role_code === 'school_admin' && primary.school_id) {
      const belongs = await prisma.userRole.findFirst({
        where: { userId: user_id, schoolId: primary.school_id },
      });
      if (!belongs) throw new ForbiddenError();
    }

    const hash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: { id: user_id },
      data:  { passwordHash: hash, mustResetPassword: true },
    });

    return Response.json({ ok: true, message: 'Password reset successfully. User will be prompted to change it on next login.' });
  } catch (err) { return handleError(err); }
}
