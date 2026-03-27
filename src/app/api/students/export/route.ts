import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError();

    const schoolId = primaryRole.school_id!;

    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        parentStudents: {
          include: {
            parent: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: [{ class: { grade: 'asc' } }, { firstName: 'asc' }],
    });

    const header = [
      'Admission No', 'First Name', 'Last Name', 'Grade', 'Section',
      'Gender', 'Date of Birth', 'Blood Group', 'Address', 'Status',
      'Parent Name', 'Parent Phone', 'Parent Email',
    ];

    const rows = students.map((s) => {
      const parent = s.parentStudents[0]?.parent;
      return [
        s.admissionNo ?? '',
        s.firstName,
        s.lastName,
        s.class?.grade    ?? '',
        s.class?.section  ?? '',
        s.gender          ?? '',
        s.dateOfBirth     ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '',
        s.bloodGroup      ?? '',
        (s.address ?? '').replace(/"/g, '""'),
        s.status,
        parent ? `${parent.user.firstName} ${parent.user.lastName}` : '',
        parent?.user.phone ?? '',
        parent?.user.email ?? '',
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v)}"`).join(','))
      .join('\r\n');

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) { return handleError(err); }
}
