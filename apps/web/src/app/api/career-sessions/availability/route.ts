/**
 * Consultant availability slots management.
 * GET  - consultant views own slots; parent/admin browse by consultant_id
 * POST - consultant creates availability slots
 * PATCH - consultant updates/deactivates a slot
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole   = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const isConsultant  = primaryRole.role_code === 'consultant';
    const { searchParams } = new URL(request.url);
    const consultantId  = searchParams.get('consultant_id');

    let filterConsultantId: string | undefined;

    if (isConsultant) {
      const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
      if (!consultant) throw new NotFoundError('Consultant profile');
      filterConsultantId = consultant.id;
    } else if (consultantId) {
      filterConsultantId = consultantId;
    }

    const slots = await prisma.consultantAvailability.findMany({
      where: {
        ...(filterConsultantId && { consultantId: filterConsultantId }),
        isActive: true,
      },
      include: {
        consultant: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        bookings: {
          where: { status: { notIn: ['cancelled'] } },
          select: { id: true, sessionDate: true, startTime: true },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return Response.json({ slots });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'consultant') throw new ForbiddenError('Only consultants can manage availability');

    const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
    if (!consultant) throw new NotFoundError('Consultant profile');

    const body = await request.json();
    const { day_of_week, date, start_time, end_time, mode, max_bookings } = body;

    if (!start_time || !end_time) throw new AppError('start_time and end_time are required');
    if (day_of_week === undefined && !date) throw new AppError('Either day_of_week or date is required');

    const slot = await prisma.consultantAvailability.create({
      data: {
        consultantId: consultant.id,
        dayOfWeek:   day_of_week ?? null,
        date:        date ? new Date(date) : null,
        startTime:   start_time,
        endTime:     end_time,
        mode:        mode ?? 'online',
        maxBookings: max_bookings ?? 1,
      },
    });

    return Response.json({ slot }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'consultant') throw new ForbiddenError('Only consultants can manage availability');

    const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
    if (!consultant) throw new NotFoundError('Consultant profile');

    const body = await request.json();
    const { id, day_of_week, date, start_time, end_time, mode, max_bookings, is_active } = body;
    if (!id) throw new AppError('id is required');

    const existing = await prisma.consultantAvailability.findFirst({ where: { id, consultantId: consultant.id } });
    if (!existing) throw new NotFoundError('Availability slot');

    const updated = await prisma.consultantAvailability.update({
      where: { id },
      data: {
        ...(day_of_week !== undefined && { dayOfWeek: day_of_week }),
        ...(date !== undefined && { date: date ? new Date(date) : null }),
        ...(start_time && { startTime: start_time }),
        ...(end_time && { endTime: end_time }),
        ...(mode && { mode }),
        ...(max_bookings !== undefined && { maxBookings: max_bookings }),
        ...(is_active !== undefined && { isActive: Boolean(is_active) }),
      },
    });

    return Response.json({ slot: updated });
  } catch (err) { return handleError(err); }
}
