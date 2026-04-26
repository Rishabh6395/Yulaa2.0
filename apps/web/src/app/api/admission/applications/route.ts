import { getUserFromRequest } from '@/lib/auth';
import { listApplications } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin'];

/** GET /api/admission/applications */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];

    // Admins: list all applications for their school
    if (ADMIN_ROLES.includes(primaryRole.role_code)) {
      if (!primaryRole.school_id) throw new ForbiddenError('No school associated');
      const { searchParams } = new URL(request.url);
      const result = await listApplications(primaryRole.school_id, searchParams);
      return Response.json(result);
    }

    // Non-admin roles (parent, guardian, or any other): list only their own applications across all schools
    const applications = await prisma.admissionApplication.findMany({
      where: {
        OR: [
          { parentUserId: user.id },
          { parentEmail:  { equals: user.email, mode: 'insensitive' } },
        ],
      },
      include: {
        children: true,
        school:   { select: { name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const rows = applications.map((a) => ({
      id:             a.id,
      parent_name:    a.parentName,
      parent_phone:   a.parentPhone,
      parent_email:   a.parentEmail,
      school_name:    (a as any).school?.name ?? null,
      status:         a.status,
      risk_score:     a.riskScore,
      children_count: a.children.length,
      children:       a.children.map((c) => ({ name: `${c.firstName} ${c.lastName}`, class: c.classApplying })),
      submitted_at:   a.submittedAt,
    }));

    return Response.json({ applications: rows, total: rows.length, page: 1, limit: rows.length, totalPages: 1 });
  } catch (err) { return handleError(err); }
}
