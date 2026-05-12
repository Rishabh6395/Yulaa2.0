import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function getPrimary(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}

function isSuperAdmin(user: any) {
  return user.roles.some((r: any) => r.role_code === 'super_admin');
}

async function getRideOrThrow(id: string, user: any) {
  const ride = await prisma.transportRide.findUnique({
    where: { id },
    include: {
      route: { select: { id: true, name: true, stops: true } },
      bus:   { select: { id: true, busNumber: true, gpsEnabled: true } },
      employee: { select: { id: true, firstName: true, lastName: true } },
      rideStudents: {
        include: { student: { select: { id: true, firstName: true, lastName: true, class: { select: { grade: true, section: true } } } } },
      },
    },
  });
  if (!ride) throw new AppError('Ride not found', 404);

  const primary = getPrimary(user);
  if (!isSuperAdmin(user) && ride.schoolId !== primary.school_id) throw new ForbiddenError();
  return ride;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const ride = await getRideOrThrow(id, user);
    return Response.json({ ride });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const ride = await getRideOrThrow(id, user);
    const body = await request.json();
    const { action } = body;

    // ── Depart: mark ride as active ──────────────────────────────────────────
    if (action === 'depart') {
      if (ride.status !== 'pending') throw new AppError('Ride already started or completed');
      const updated = await prisma.transportRide.update({
        where: { id },
        data: {
          status: 'active',
          departureTime: new Date(),
          emergencyContact: body.emergencyContact ?? ride.emergencyContact,
          gpsEnabled: body.gpsEnabled ?? ride.gpsEnabled,
        },
        include: {
          route: { select: { id: true, name: true } },
          rideStudents: {
            include: { student: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      });

      // Log notifications (actual push/SMS handled by external service)
      await prisma.rideStudent.updateMany({
        where: { rideId: id },
        data: { notifiedAt: new Date() },
      });

      return Response.json({ ride: updated, notified: updated.rideStudents.length });
    }

    // ── Complete: mark ride done ──────────────────────────────────────────────
    if (action === 'complete') {
      if (ride.status !== 'active') throw new AppError('Ride is not active');
      const updated = await prisma.transportRide.update({
        where: { id },
        data: { status: 'completed', arrivalTime: new Date() },
      });
      return Response.json({ ride: updated });
    }

    // ── Cancel ────────────────────────────────────────────────────────────────
    if (action === 'cancel') {
      const updated = await prisma.transportRide.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      return Response.json({ ride: updated });
    }

    // ── Mark student pickup ───────────────────────────────────────────────────
    if (action === 'student_pickup') {
      const { studentId, status } = body;
      if (!studentId || !status) throw new AppError('studentId and status required');
      const rs = await prisma.rideStudent.findFirst({ where: { rideId: id, studentId } });
      if (!rs) throw new AppError('Student not on this ride');
      await prisma.rideStudent.update({
        where: { id: rs.id },
        data: { pickupStatus: status },
      });
      return Response.json({ success: true });
    }

    // ── Mark student drop ─────────────────────────────────────────────────────
    if (action === 'student_drop') {
      const { studentId, status } = body;
      if (!studentId || !status) throw new AppError('studentId and status required');
      const rs = await prisma.rideStudent.findFirst({ where: { rideId: id, studentId } });
      if (!rs) throw new AppError('Student not on this ride');
      await prisma.rideStudent.update({
        where: { id: rs.id },
        data: { dropStatus: status },
      });
      return Response.json({ success: true });
    }

    // ── Update GPS location ───────────────────────────────────────────────────
    if (action === 'gps_update') {
      const { lat, lng } = body;
      await prisma.transportRide.update({
        where: { id },
        data: { gpsLat: lat, gpsLng: lng },
      });
      return Response.json({ success: true });
    }

    throw new AppError('Unknown action', 400);
  } catch (err) { return handleError(err); }
}
