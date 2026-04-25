import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { handleError, AppError, UnauthorizedError } from '@/utils/errors';
import * as repo from '@/modules/otp/otp.repo';

function normalisePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;
  throw new AppError('Invalid phone number format', 400);
}

/** POST /api/auth/verify-otp — mobile phone login step 2, public */
export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();
    if (!phone || !otp) throw new AppError('phone and otp are required');

    const e164   = normalisePhone(phone);
    const record = await repo.findValidOtp(e164, otp);
    if (!record) throw new UnauthorizedError('Invalid or expired OTP');
    await repo.markVerified(record.id);

    const user = await prisma.user.findFirst({
      where: { phone: e164, status: 'active' },
      include: { userRoles: { include: { role: true, school: true } } },
    });

    if (!user) throw new UnauthorizedError('No active account found for this phone number');

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

    return Response.json({
      token,
      user: {
        id:          user.id,
        name:        `${user.firstName} ${user.lastName}`.trim(),
        phone:       user.phone,
        primaryRole: primaryRole?.role_code ?? null,
        schoolId:    primaryRole?.school_id ?? null,
        schoolName:  primaryRole?.school_name ?? null,
        roles,
      },
    });
  } catch (err) { return handleError(err); }
}
