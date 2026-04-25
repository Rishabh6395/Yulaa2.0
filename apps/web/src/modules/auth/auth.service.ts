import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { AppError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import type { LoginInput, LoginResponse, ChangePasswordInput } from './auth.types';
import { generateToken, hashPassword } from '@/utils/utils';
import { setCache } from '@/services/cache.service';



export async function login(
  { username, password, login_context }: LoginInput): Promise<LoginResponse> {
  if (!username || !password) throw new AppError('Username and password are required');

  const encryptedPassword = hashPassword(password);

  // setting default context as parent
  login_context = login_context ?? 'parent';

  // if (login_context === 'super-admin') {
  // } else if (login_context === 'school-admin') {
  // }

  const user = await prisma.userV1.findFirst({
    where: {
      username: username,
      OR: [
        { password: password },
        { password: encryptedPassword },
      ],
      status: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid username or password');
  }

  if (login_context === 'parent') {
    const parents = await prisma.parentV1.findMany({
      where: {
        userId: user.userId,
        active: true,
      },
    });

    // todo loop through parents and save in the response
  }

  // Consultant contract expiry check
  if (user.userRoles.some((ur) => ur.role.code === 'consultant')) {
    const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
    if (consultant) {
      const contract = await prisma.consultantContract.findFirst({
        where: { consultantId: consultant.id },
        include: { school: true },
        orderBy: { endDate: 'desc' },
      });

      if (!contract) {
        throw new ForbiddenError('No contract found for your account. Contact the school administrator.');
      }

      const isExpired = contract.endDate < new Date() || ['expired', 'terminated'].includes(contract.status);
      if (isExpired) {
        const expiredOn = contract.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const err = new ForbiddenError(
          `Your consulting contract (${contract.contractNo}) expired on ${expiredOn}. Please contact ${contract.school.name} to renew.`
        );
        (err as any).code = 'CONTRACT_EXPIRED';
        throw err;
      }
    }
  }

  const roles = user.userRoles.map((ur) => ({
    role_code: ur.role.code,
    role_name: ur.role.displayName,
    school_id: ur.schoolId,
    school_name: ur.school?.name ?? null,
    is_primary: ur.isPrimary,
  }));

  const primaryRole = roles.find((r) => r.is_primary) ?? roles[0];
  const token = generateToken();

  const result = {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      primaryRole: primaryRole?.role_code,
      schoolId: primaryRole?.school_id ?? null,
      schoolName: primaryRole?.school_name ?? null,
      mustResetPassword: user.mustResetPassword,
    },
  };;

  await setCache(
    token,
    result,
    60 * 60 * 24
  );

  return result;
}

export async function changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
  if (!newPassword || newPassword.length < 8) throw new AppError('New password must be at least 8 characters');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, mustResetPassword: false } });
}
