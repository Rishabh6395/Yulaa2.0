/**
 * Consultant session ratings.
 * GET  - public; lists ratings for a consultant_id
 * POST - parent submits rating after a completed booking
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const consultantId = searchParams.get('consultant_id');

    const ratings = await prisma.consultantRating.findMany({
      where: { ...(consultantId && { consultantId }) },
      include: {
        parent: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      parent_name: `${r.parent.user.firstName} ${r.parent.user.lastName}`,
      created_at: r.createdAt,
    }));

    return Response.json({ ratings: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'parent') throw new ForbiddenError('Only parents can submit ratings');

    const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
    if (!parent) throw new NotFoundError('Parent profile');

    const body = await request.json();
    const { booking_id, rating, review } = body;

    if (!booking_id || !rating) throw new AppError('booking_id and rating are required');
    if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5');

    const booking = await prisma.sessionBooking.findUnique({ where: { id: booking_id } });
    if (!booking) throw new NotFoundError('Booking');
    if (booking.parentId !== parent.id) throw new ForbiddenError('This booking does not belong to you');
    if (booking.status !== 'completed') throw new AppError('Can only rate completed sessions', 400);

    const existing = await prisma.consultantRating.findUnique({ where: { bookingId: booking_id } });
    if (existing) throw new AppError('You have already rated this session', 409);

    const consultantRating = await prisma.consultantRating.create({
      data: {
        bookingId:    booking_id,
        consultantId: booking.consultantId,
        parentId:     parent.id,
        rating:       Math.round(rating),
        review:       review ?? null,
      },
    });

    return Response.json({ rating: consultantRating }, { status: 201 });
  } catch (err) { return handleError(err); }
}
