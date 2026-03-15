import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim(), status: 'active' },
      include: {
        userRoles: {
          include: { role: true, school: true },
        },
      },
    });

    if (!user) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Consultant contract expiry check
    const isConsultant = user.userRoles.some((ur) => ur.role.code === 'consultant');
    if (isConsultant) {
      const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
      if (consultant) {
        const contract = await prisma.consultantContract.findFirst({
          where: { consultantId: consultant.id },
          include: { school: true },
          orderBy: { endDate: 'desc' },
        });

        if (!contract) {
          return Response.json(
            { error: 'No contract found for your account. Contact the school administrator.' },
            { status: 403 }
          );
        }

        const isExpired =
          contract.endDate < new Date() ||
          contract.status === 'expired' ||
          contract.status === 'terminated';

        if (isExpired) {
          const expiredOn = contract.endDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          return Response.json(
            {
              error: `Your consulting contract (${contract.contractNo}) expired on ${expiredOn}. Please contact ${contract.school.name} to renew your contract.`,
              code: 'CONTRACT_EXPIRED',
            },
            { status: 403 }
          );
        }
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { createdAt: user.createdAt }, // no-op update; lastLoginAt not in schema
    });

    const roles = user.userRoles.map((ur) => ({
      role_code: ur.role.code,
      role_name: ur.role.displayName,
      school_id: ur.schoolId,
      school_name: ur.school?.name ?? null,
      is_primary: ur.isPrimary,
    }));

    const primaryRole = roles.find((r) => r.is_primary) ?? roles[0];
    const token = signToken({
      userId: user.id,
      email: user.email,
      primaryRole: primaryRole?.role_code,
      schoolId: primaryRole?.school_id,
    });

    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        primaryRole: primaryRole?.role_code,
        schoolId: primaryRole?.school_id,
        schoolName: primaryRole?.school_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
