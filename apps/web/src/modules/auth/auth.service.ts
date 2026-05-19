import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { AppError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import type { LoginInput, LoginResponse, ChangePasswordInput } from './auth.types';

export async function login({ email, password }: LoginInput): Promise<LoginResponse> {
  if (!email || !password) throw new AppError('Email / Admission No and password are required');

  const identifier = email.trim();

  // Primary: lookup by email
  let user = await prisma.user.findFirst({
    where: { email: identifier.toLowerCase(), status: 'active' },
    include: { userRoles: { include: { role: true, school: true } } },
  });

  // Fallback: lookup by admissionNo (student login with admission number)
  if (!user) {
    const student = await prisma.student.findFirst({
      where: { admissionNo: identifier, status: 'active' },
      select: { userId: true },
    });
    if (student?.userId) {
      user = await prisma.user.findFirst({
        where: { id: student.userId, status: 'active' },
        include: { userRoles: { include: { role: true, school: true } } },
      });
    }
  }

  if (!user) throw new UnauthorizedError('Invalid email / admission no or password');

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

  // Vendor contract expiry check
  if (user.userRoles.some((ur) => ur.role.code === 'vendor')) {
    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (vendor && !vendor.isActive) {
      throw new ForbiddenError('Your vendor account has been deactivated. Contact the administrator.');
    }
    if (vendor?.contractEnd && vendor.contractEnd < new Date()) {
      const expiredOn = vendor.contractEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const err = new ForbiddenError(
        `Your vendor contract expired on ${expiredOn}. Please contact the school administrator to renew.`
      );
      (err as any).code = 'CONTRACT_EXPIRED';
      throw err;
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
      id:                user.id,
      email:             user.email,
      firstName:         user.firstName,
      lastName:          user.lastName,
      phone:             user.phone ?? null,
      roles,
      primaryRole:       primaryRole?.role_code,
      schoolId:          primaryRole?.school_id ?? null,
      schoolName:        primaryRole?.school_name ?? null,
      mustResetPassword: user.mustResetPassword,
    },
  };
}

export async function changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
  if (!newPassword || newPassword.length < 8) throw new AppError('New password must be at least 8 characters');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, mustResetPassword: false } });
}
