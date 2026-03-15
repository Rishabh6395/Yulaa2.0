import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { AppError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import type { LoginInput, LoginResponse } from './auth.types';

export async function login({ email, password }: LoginInput): Promise<LoginResponse> {
  if (!email || !password) throw new AppError('Email and password are required');

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim(), status: 'active' },
    include: { userRoles: { include: { role: true, school: true } } },
  });

  if (!user) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)  throw new UnauthorizedError('Invalid email or password');

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
    role_code:   ur.role.code,
    role_name:   ur.role.displayName,
    school_id:   ur.schoolId,
    school_name: ur.school?.name ?? null,
    is_primary:  ur.isPrimary,
  }));

  const primaryRole = roles.find((r) => r.is_primary) ?? roles[0];
  const token = signToken({
    userId:      user.id,
    email:       user.email,
    primaryRole: primaryRole?.role_code,
    schoolId:    primaryRole?.school_id,
  });

  return {
    token,
    user: {
      id:          user.id,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      roles,
      primaryRole: primaryRole?.role_code,
      schoolId:    primaryRole?.school_id ?? null,
      schoolName:  primaryRole?.school_name ?? null,
    },
  };
}
