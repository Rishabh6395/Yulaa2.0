/**
 * Vendor ratings.
 * GET  - public; filtered by vendor_id
 * POST - parent rates after a delivered order
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');

    const ratings = await prisma.vendorRating.findMany({
      where: { ...(vendorId && { vendorId }) },
      include: {
        parent: { include: { user: { select: { firstName: true, lastName: true } } } },
        order:  { select: { orderNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      order_no: r.order.orderNo,
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
    const { order_id, rating, review } = body;

    if (!order_id || !rating) throw new AppError('order_id and rating are required');
    if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5');

    const order = await prisma.vendorOrder.findUnique({ where: { id: order_id } });
    if (!order) throw new NotFoundError('Order');
    if (order.parentId !== parent.id) throw new ForbiddenError('This order does not belong to you');
    if (order.status !== 'delivered') throw new AppError('Can only rate delivered orders', 400);

    const existing = await prisma.vendorRating.findUnique({ where: { orderId: order_id } });
    if (existing) throw new AppError('You have already rated this order', 409);

    const vendorRating = await prisma.vendorRating.create({
      data: {
        orderId:  order_id,
        vendorId: order.vendorId,
        parentId: parent.id,
        rating:   Math.round(rating),
        review:   review ?? null,
      },
    });

    return Response.json({ rating: vendorRating }, { status: 201 });
  } catch (err) { return handleError(err); }
}
