/**
 * Vendor orders (e-commerce style).
 * GET  - parent: own orders; vendor: incoming orders; admin: school orders
 * POST - parent places order
 * PATCH - vendor confirms/ships/delivers; parent cancels
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function generateOrderNo(): string {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let where: Record<string, unknown> = {};

    if (primaryRole.role_code === 'parent') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
      if (!parent) throw new NotFoundError('Parent profile');
      where = { parentId: parent.id };
    } else if (primaryRole.role_code === 'vendor') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
      if (!vendor) throw new NotFoundError('Vendor profile');
      where = { vendorId: vendor.id };
    } else if (['school_admin', 'principal', 'hod', 'super_admin'].includes(primaryRole.role_code)) {
      // admin sees orders where parent belongs to their school — filter via parent->student->school
      // simplified: show all for super_admin, school-scoped for others
      if (primaryRole.role_code !== 'super_admin' && primaryRole.school_id) {
        const schoolParents = await prisma.parentStudent.findMany({
          where: { student: { schoolId: primaryRole.school_id } },
          select: { parentId: true },
          distinct: ['parentId'],
        });
        where = { parentId: { in: schoolParents.map((p) => p.parentId) } };
      }
    } else {
      throw new ForbiddenError();
    }

    if (statusFilter) where.status = statusFilter;

    const orders = await prisma.vendorOrder.findMany({
      where,
      include: {
        vendor: { select: { id: true, companyName: true } },
        parent: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        items: {
          include: { product: { select: { id: true, name: true, category: true, imageUrls: true } } },
        },
        rating: { select: { rating: true, review: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = orders.map((o) => ({
      id: o.id,
      order_no: o.orderNo,
      status: o.status,
      payment_status: o.paymentStatus,
      total_amount: Number(o.totalAmount),
      delivery_mode: o.deliveryMode,
      delivery_address: o.deliveryAddress,
      notes: o.notes,
      created_at: o.createdAt,
      vendor: { id: o.vendorId, company_name: o.vendor.companyName },
      parent: {
        id: o.parentId,
        name: `${o.parent.user.firstName} ${o.parent.user.lastName}`,
        email: o.parent.user.email,
      },
      items: o.items.map((i) => ({
        id: i.id,
        product_id: i.productId,
        product_name: i.product.name,
        category: i.product.category,
        image_url: i.product.imageUrls[0] ?? null,
        quantity: i.quantity,
        unit_price: Number(i.unitPrice),
        total: Number(i.total),
      })),
      rating: o.rating,
    }));

    return Response.json({ orders: rows, total: rows.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'parent') throw new ForbiddenError('Only parents can place orders');

    const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
    if (!parent) throw new NotFoundError('Parent profile');

    const body = await request.json();
    const { vendor_id, items, delivery_mode, delivery_address, notes } = body;

    if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('vendor_id and items[] are required');
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendor_id } });
    if (!vendor || !vendor.isActive) throw new NotFoundError('Vendor');

    // Validate products and calculate total
    let total = 0;
    const orderItems: { productId: string; quantity: number; unitPrice: number; total: number }[] = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        throw new AppError('Each item requires product_id and quantity >= 1');
      }
      const product = await prisma.vendorProduct.findFirst({
        where: { id: item.product_id, vendorId: vendor_id, isActive: true },
      });
      if (!product) throw new NotFoundError(`Product ${item.product_id}`);
      if (product.quantity < item.quantity) throw new AppError(`Insufficient stock for ${product.name}`, 409);

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;
      orderItems.push({ productId: item.product_id, quantity: item.quantity, unitPrice, total: lineTotal });
    }

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.vendorOrder.create({
        data: {
          vendorId:        vendor_id,
          parentId:        parent.id,
          orderNo:         generateOrderNo(),
          totalAmount:     total,
          deliveryMode:    delivery_mode ?? 'delivery',
          deliveryAddress: delivery_address ?? null,
          notes:           notes ?? null,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Decrement stock
      for (const item of orderItems) {
        await tx.vendorProduct.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return o;
    });

    return Response.json({ order }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const body = await request.json();
    const { id, action, payment_ref } = body;
    if (!id || !action) throw new AppError('id and action are required');

    const order = await prisma.vendorOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundError('Order');

    const VENDOR_ACTIONS: Record<string, { from: string[]; to: string }> = {
      confirm:  { from: ['pending'], to: 'confirmed' },
      ship:     { from: ['confirmed'], to: 'shipped' },
      deliver:  { from: ['shipped'], to: 'delivered' },
    };
    const SHARED_ACTIONS: Record<string, { from: string[]; to: string }> = {
      cancel: { from: ['pending', 'confirmed'], to: 'cancelled' },
      pay:    { from: ['pending', 'confirmed'], to: order.status },
    };

    const transition = { ...VENDOR_ACTIONS, ...SHARED_ACTIONS }[action];
    if (!transition) throw new AppError(`Unknown action: ${action}`, 400);

    if (!transition.from.includes(order.status)) {
      throw new AppError(`Cannot ${action} an order with status '${order.status}'`, 400);
    }

    if (action in VENDOR_ACTIONS) {
      const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
      if (!vendor || vendor.id !== order.vendorId) throw new ForbiddenError('Only the assigned vendor can perform this action');
    }

    if (action === 'cancel') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
      const vendor  = await prisma.vendor.findUnique({ where: { userId: user.id } });
      const isAdmin = ['school_admin', 'super_admin'].includes(primaryRole.role_code);
      if (!isAdmin && parent?.id !== order.parentId && vendor?.id !== order.vendorId) throw new ForbiddenError();

      // Restore stock on cancel
      await prisma.$transaction(
        order.items.map((i) =>
          prisma.vendorProduct.update({
            where: { id: i.productId },
            data: { quantity: { increment: i.quantity } },
          }),
        ),
      );
    }

    const updated = await prisma.vendorOrder.update({
      where: { id },
      data: {
        status: transition.to,
        ...(action === 'pay' && payment_ref && { paymentStatus: 'paid', paymentRef: payment_ref }),
      },
    });

    return Response.json({ order: updated });
  } catch (err) { return handleError(err); }
}
