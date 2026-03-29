import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

async function getSchoolId(user: any): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.school_id) return primary.school_id;
  const def = await prisma.school.findFirst({ where: { isDefault: true }, select: { id: true } });
  if (def) return def.id;
  throw new AppError('No school found');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const schoolId = await getSchoolId(user);
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const category = searchParams.get('category') || undefined;

    if (itemId) {
      const item = await prisma.inventoryItem.findFirst({
        where: { id: itemId, schoolId },
        include: {
          stock: true,
          issues: { orderBy: { issuedDate: 'desc' }, take: 20 },
          purchases: { orderBy: { purchaseDate: 'desc' }, take: 20 },
        },
      });
      if (!item) throw new AppError('Item not found');
      return Response.json({ item });
    }

    const items = await prisma.inventoryItem.findMany({
      where: { schoolId, ...(category ? { category } : {}) },
      include: { stock: true },
      orderBy: { name: 'asc' },
    });

    // Summary stats
    const lowStock = items.filter(i => i.stock && i.stock.quantity <= i.minStock);
    return Response.json({ items, lowStockCount: lowStock.length });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;
    const schoolId = await getSchoolId(user);

    // Create item
    if (!action || action === 'create_item') {
      const { name, category, unit, minStock, description } = body;
      if (!name || !category) throw new AppError('name and category required');
      const item = await prisma.inventoryItem.create({
        data: {
          schoolId,
          name,
          category,
          unit: unit || 'piece',
          minStock: minStock ?? 0,
          description: description || null,
        },
      });
      // Auto-create stock record
      await prisma.inventoryStock.create({ data: { itemId: item.id, quantity: 0 } });
      return Response.json({ item }, { status: 201 });
    }

    // Record purchase
    if (action === 'purchase') {
      const { itemId, vendorName, quantity, unitPrice, purchaseDate, invoiceNo } = body;
      if (!itemId || !quantity || !unitPrice) throw new AppError('itemId, quantity, unitPrice required');
      const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, schoolId } });
      if (!item) throw new AppError('Item not found');
      const totalAmount = Number(quantity) * Number(unitPrice);
      const purchase = await prisma.inventoryPurchase.create({
        data: {
          itemId,
          vendorName: vendorName || '',
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          totalAmount,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          invoiceNo: invoiceNo || null,
        },
      });
      // Update stock
      await prisma.inventoryStock.upsert({
        where: { itemId },
        update: { quantity: { increment: Number(quantity) } },
        create: { itemId, quantity: Number(quantity) },
      });
      return Response.json({ purchase }, { status: 201 });
    }

    // Issue item
    if (action === 'issue') {
      const { itemId, issuedTo, issuedToName, quantity, purpose, expectedReturn } = body;
      if (!itemId || !issuedTo || !quantity) throw new AppError('itemId, issuedTo, quantity required');
      const stock = await prisma.inventoryStock.findUnique({ where: { itemId } });
      if (!stock || stock.quantity < Number(quantity)) throw new AppError('Insufficient stock');
      const issue = await prisma.inventoryIssue.create({
        data: {
          itemId,
          issuedTo,
          issuedToName: issuedToName || null,
          quantity: Number(quantity),
          purpose: purpose || null,
          issuedDate: new Date(),
          expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
          status: 'issued',
        },
      });
      await prisma.inventoryStock.update({ where: { itemId }, data: { quantity: { decrement: Number(quantity) } } });
      return Response.json({ issue }, { status: 201 });
    }

    // Return item
    if (action === 'return') {
      const { issueId } = body;
      if (!issueId) throw new AppError('issueId required');
      const issue = await prisma.inventoryIssue.findFirst({ where: { id: issueId, item: { schoolId } } });
      if (!issue) throw new AppError('Issue record not found');
      if (issue.status === 'returned') throw new AppError('Already returned');
      await prisma.inventoryIssue.update({ where: { id: issueId }, data: { status: 'returned', returnedAt: new Date() } });
      await prisma.inventoryStock.update({ where: { itemId: issue.itemId }, data: { quantity: { increment: issue.quantity } } });
      return Response.json({ ok: true });
    }

    throw new AppError('Unknown action');
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const body = await request.json();
    const { itemId, name, category, unit, minStock, description } = body;
    if (!itemId) throw new AppError('itemId required');
    const schoolId = await getSchoolId(user);
    const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, schoolId } });
    if (!item) throw new AppError('Item not found');
    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unit && { unit }),
        ...(minStock !== undefined && { minStock }),
        ...(description !== undefined && { description }),
      },
    });
    return Response.json({ item: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const { itemId } = await request.json();
    if (!itemId) throw new AppError('itemId required');
    const schoolId = await getSchoolId(user);
    await prisma.inventoryItem.deleteMany({ where: { id: itemId, schoolId } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
