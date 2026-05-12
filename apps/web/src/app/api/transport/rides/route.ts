import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const OPERATOR_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher', 'employee'];

function getPrimaryRole(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}

function getSchoolId(user: any, override?: string | null): string {
  if (user.roles.some((r: any) => r.role_code === 'super_admin') && override) return override;
  const primary = getPrimaryRole(user);
  if (!primary.school_id) throw new ForbiddenError();
  return primary.school_id;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const primary = getPrimaryRole(user);
    const isSuperAdmin = user.roles.some((r: any) => r.role_code === 'super_admin');
    const isParent = primary.role_code === 'parent';

    if (isParent) {
      // Parent: see rides their children are on
      const parent = await prisma.parent.findUnique({
        where: { userId: user.id },
        include: { parentStudents: { select: { studentId: true } } },
      });
      if (!parent) return Response.json({ rides: [] });
      const studentIds = parent.parentStudents.map((ps: any) => ps.studentId);

      const rideStudents = await prisma.rideStudent.findMany({
        where: { studentId: { in: studentIds } },
        include: {
          ride: {
            include: {
              route: { select: { id: true, name: true, stops: true } },
              bus: { select: { id: true, busNumber: true, gpsEnabled: true } },
              employee: { select: { firstName: true, lastName: true } },
            },
          },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { ride: { createdAt: 'desc' } },
        take: 20,
      });
      return Response.json({ rideStudents });
    }

    // Staff/admin: see all rides for school
    const schoolId = getSchoolId(user, searchParams.get('school_id'));
    const statusFilter = searchParams.get('status');
    const limit = Number(searchParams.get('limit') ?? '20');

    const rides = await prisma.transportRide.findMany({
      where: {
        schoolId,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(!isSuperAdmin && primary.role_code === 'teacher'
          ? { employeeId: user.id }
          : {}),
      },
      include: {
        route: { select: { id: true, name: true, stops: true, vehicleNo: true } },
        bus: { select: { id: true, busNumber: true, gpsEnabled: true } },
        employee: { select: { firstName: true, lastName: true } },
        _count: { select: { rideStudents: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return Response.json({ rides });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r: any) => OPERATOR_ROLES.includes(r.role_code))) throw new ForbiddenError();

    const body = await request.json();
    const schoolId = getSchoolId(user, body.schoolId);

    const { routeId, busId, direction, emergencyContact, studentIds, gpsEnabled } = body;
    if (!routeId) throw new AppError('routeId is required');
    if (!Array.isArray(studentIds) || studentIds.length === 0) throw new AppError('Select at least one student');

    // Verify route belongs to school
    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) throw new AppError('Route not found', 404);

    // Verify bus if provided
    if (busId) {
      const bus = await prisma.transportBus.findFirst({ where: { id: busId, schoolId } });
      if (!bus) throw new AppError('Bus not found', 404);
    }

    // Verify all students belong to school
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true },
    });
    if (students.length !== studentIds.length) throw new AppError('One or more students not found');

    const ride = await prisma.transportRide.create({
      data: {
        schoolId,
        routeId,
        busId:           busId || null,
        employeeId:      user.id,
        direction:       direction || 'morning',
        emergencyContact: emergencyContact || null,
        status:          'pending',
        gpsEnabled:      gpsEnabled ?? false,
        rideStudents: {
          create: studentIds.map((sid: string) => ({ studentId: sid })),
        },
      },
      include: {
        route: { select: { id: true, name: true, stops: true } },
        bus:   { select: { id: true, busNumber: true } },
        rideStudents: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return Response.json({ ride }, { status: 201 });
  } catch (err) { return handleError(err); }
}
