/**
 * Individual session bookings.
 * GET  - parent: own bookings; consultant: incoming bookings; admin: all for school
 * POST - parent books a session
 * PATCH - consultant confirms/completes; parent cancels
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole  = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let where: Record<string, unknown> = {};

    if (primaryRole.role_code === 'parent') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
      if (!parent) throw new NotFoundError('Parent profile');
      where = { parentId: parent.id };
    } else if (primaryRole.role_code === 'consultant') {
      const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
      if (!consultant) throw new NotFoundError('Consultant profile');
      where = { consultantId: consultant.id };
    } else if (['school_admin', 'principal', 'hod', 'super_admin'].includes(primaryRole.role_code)) {
      if (primaryRole.school_id) where = { schoolId: primaryRole.school_id };
    } else {
      throw new ForbiddenError();
    }

    if (statusFilter) where.status = statusFilter;

    const bookings = await prisma.sessionBooking.findMany({
      where,
      include: {
        consultant: {
          include: { user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } } },
        },
        parent: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        student: { select: { id: true, firstName: true, lastName: true } },
        rating: { select: { rating: true, review: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });

    const rows = bookings.map((b) => ({
      id: b.id,
      session_date: b.sessionDate,
      start_time: b.startTime,
      end_time: b.endTime,
      mode: b.mode,
      meeting_link: b.meetingLink,
      notes: b.notes,
      status: b.status,
      session_fee: b.sessionFee ? Number(b.sessionFee) : null,
      payment_status: b.paymentStatus,
      cancellation_note: b.cancellationNote,
      created_at: b.createdAt,
      consultant: {
        id: b.consultantId,
        name: `${b.consultant.user.firstName} ${b.consultant.user.lastName}`,
        specialization: b.consultant.specialization,
        avatar_url: b.consultant.user.avatarUrl,
      },
      parent: {
        id: b.parentId,
        name: `${b.parent.user.firstName} ${b.parent.user.lastName}`,
        email: b.parent.user.email,
      },
      student: b.student,
      rating: b.rating,
    }));

    return Response.json({ bookings: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'parent')
      throw new ForbiddenError('Only parents can book career sessions. Please log in with a parent account.');

    const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
    if (!parent)
      throw new AppError('Your parent profile could not be found. Please contact your school administrator to set up your profile.', 404);

    const body = await request.json();
    const { consultant_id, availability_id, student_id, session_date, start_time, end_time, mode, notes } = body;

    if (!consultant_id)
      throw new AppError('Please select a consultant before booking.');
    if (!session_date)
      throw new AppError('Please select a date for the session.');
    if (!start_time || !end_time)
      throw new AppError('Session time could not be determined. Please go back and select a time slot again.');

    const sessionDateParsed = new Date(session_date);
    if (isNaN(sessionDateParsed.getTime()))
      throw new AppError(`The session date "${session_date}" is not valid. Please select a valid date.`);

    const consultant = await prisma.consultant.findUnique({ where: { id: consultant_id } });
    if (!consultant)
      throw new AppError('The selected consultant was not found. Please go back and choose a different consultant.', 404);
    if (!consultant.isActive)
      throw new AppError('This consultant is not currently accepting bookings. Please choose a different consultant.', 404);

    // Check availability slot capacity if provided
    if (availability_id) {
      const slot = await prisma.consultantAvailability.findUnique({ where: { id: availability_id } });
      if (!slot)
        throw new AppError('The selected time slot is no longer available. Please go back and choose a different slot.', 404);
      if (!slot.isActive)
        throw new AppError('The selected time slot has been deactivated. Please go back and choose an active slot.', 404);

      const existingBookings = await prisma.sessionBooking.count({
        where: { availabilityId: availability_id, sessionDate: sessionDateParsed, status: { notIn: ['cancelled'] } },
      });
      if (existingBookings >= slot.maxBookings) {
        throw new AppError(
          `This time slot is fully booked for ${new Date(session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Please select a different date or slot.`,
          409,
        );
      }
    }

    const booking = await prisma.sessionBooking.create({
      data: {
        consultantId:  consultant_id,
        parentId:      parent.id,
        availabilityId: availability_id ?? null,
        studentId:     student_id ?? null,
        schoolId:      primaryRole.school_id ?? null,
        sessionDate:   sessionDateParsed,
        startTime:     start_time,
        endTime:       end_time,
        mode:          mode ?? 'online',
        notes:         notes ?? null,
        sessionFee:    consultant.sessionFee ?? null,
        status:        'pending',
        paymentStatus: consultant.sessionFee ? 'pending' : 'not_required',
      },
    });

    return Response.json({ booking }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const body = await request.json();
    const { id, action, meeting_link, cancellation_note, payment_ref } = body;
    if (!id || !action) throw new AppError('id and action are required');

    const booking = await prisma.sessionBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundError('Booking');

    const VALID_TRANSITIONS: Record<string, { from: string[]; to: string }> = {
      confirm:  { from: ['pending'], to: 'confirmed' },
      complete: { from: ['confirmed'], to: 'completed' },
      cancel:   { from: ['pending', 'confirmed'], to: 'cancelled' },
      pay:      { from: ['pending', 'confirmed'], to: booking.status },
    };

    const transition = VALID_TRANSITIONS[action];
    if (!transition) throw new AppError(`Unknown action: ${action}`, 400);

    if (!transition.from.includes(booking.status)) {
      throw new AppError(`Cannot ${action} a booking with status '${booking.status}'`, 400);
    }

    // Authorisation per action
    if (action === 'confirm' || action === 'complete') {
      const consultant = await prisma.consultant.findUnique({ where: { id: booking.consultantId } });
      if (!consultant || consultant.userId !== user.id) throw new ForbiddenError('Only the assigned consultant can perform this action');
    }
    if (action === 'cancel') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
      const consultant = await prisma.consultant.findUnique({ where: { userId: user.id } });
      const isAdmin = ['school_admin', 'super_admin'].includes(primaryRole.role_code);
      if (!isAdmin && parent?.id !== booking.parentId && consultant?.id !== booking.consultantId) {
        throw new ForbiddenError();
      }
    }

    const updated = await prisma.sessionBooking.update({
      where: { id },
      data: {
        status: transition.to,
        ...(meeting_link !== undefined && { meetingLink: meeting_link }),
        ...(cancellation_note !== undefined && { cancellationNote: cancellation_note }),
        ...(action === 'pay' && payment_ref && { paymentStatus: 'paid', paymentRef: payment_ref }),
      },
    });

    return Response.json({ booking: updated });
  } catch (err) { return handleError(err); }
}
