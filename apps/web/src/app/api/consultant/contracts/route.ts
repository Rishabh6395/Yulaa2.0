import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole  = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const isConsultant = primaryRole.role_code === 'consultant';
  const isAdmin      = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

  if (!isConsultant && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let contracts;

    if (isConsultant) {
      const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
      if (!consultant) return Response.json({ error: 'Consultant profile not found' }, { status: 404 });

      const rows = await prisma.consultantContract.findMany({
        where: { consultantId: consultant.id },
        include: { school: { select: { name: true, email: true } } },
        orderBy: { endDate: 'desc' },
      });

      contracts = rows.map((c) => ({
        id: c.id,
        contract_no: c.contractNo,
        start_date: c.startDate,
        end_date: c.endDate,
        contract_value: c.contractValue ? Number(c.contractValue) : null,
        status: c.status,
        created_at: c.createdAt,
        school_name: c.school.name,
        school_email: c.school.email,
        days_remaining: Math.ceil((c.endDate.getTime() - today.getTime()) / 86400000),
      }));
    } else {
      const rows = await prisma.consultantContract.findMany({
        where: { schoolId: primaryRole.school_id! },
        include: {
          consultant: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
        orderBy: { endDate: 'desc' },
      });

      contracts = rows.map((c) => ({
        id: c.id,
        contract_no: c.contractNo,
        start_date: c.startDate,
        end_date: c.endDate,
        contract_value: c.contractValue ? Number(c.contractValue) : null,
        status: c.status,
        created_at: c.createdAt,
        consultant_name: `${c.consultant.user.firstName} ${c.consultant.user.lastName}`,
        consultant_email: c.consultant.user.email,
        specialization: c.consultant.specialization,
        days_remaining: Math.ceil((c.endDate.getTime() - today.getTime()) / 86400000),
      }));
    }

    return Response.json({ contracts });
  } catch (err) {
    console.error('Contracts GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
