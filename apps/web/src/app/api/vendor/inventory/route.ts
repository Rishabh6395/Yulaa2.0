import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { withCache, cacheInvalidate, CacheTTL } from '@/services/cache.service';

async function getVendor(userId: string) {
  return prisma.vendor.findUnique({ where: { userId } });
}

const VALID_CATEGORIES = ['books', 'uniform', 'lanyard', 'stationery', 'sports', 'other'];

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? '';
  const status   = searchParams.get('status') ?? '';

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const isVendor    = primaryRole.role_code === 'vendor';
  const isAdmin     = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

  if (!isVendor && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const key = isVendor
      ? `inventory:vendor:${user.id}:${category}:${status}`
      : `inventory:school:${primaryRole.school_id}:${category}:${status}`;

    const result = await withCache(key, CacheTTL.list, async () => {
      let vendorId: string | undefined;

      if (isVendor) {
        const vendor = await getVendor(user.id);
        if (!vendor) return null;
        vendorId = vendor.id;
      }

      const items = await prisma.vendorInventory.findMany({
        where: {
          ...(isVendor && vendorId ? { vendorId } : {}),
          ...(isAdmin && !isVendor ? { OR: [{ schoolId: primaryRole.school_id! }, { schoolId: null }] } : {}),
          ...(category && { category }),
          ...(status && { status }),
        },
        include: {
          vendor: { include: { user: { select: { firstName: true, lastName: true } } } },
          school: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const rows = items.map((vi) => ({
        id: vi.id,
        name: vi.name,
        category: vi.category,
        description: vi.description,
        price: Number(vi.price),
        quantity: vi.quantity,
        unit: vi.unit,
        image_url: vi.imageUrl,
        status: vi.status,
        created_at: vi.createdAt,
        vendor_name: vi.vendor.companyName,
        vendor_contact: `${vi.vendor.user.firstName} ${vi.vendor.user.lastName}`,
        school_name: vi.school?.name ?? null,
      }));

      const allItems = isVendor && vendorId
        ? await prisma.vendorInventory.findMany({ where: { vendorId }, select: { category: true, status: true } })
        : await prisma.vendorInventory.findMany({
            where: { OR: [{ schoolId: primaryRole.school_id! }, { schoolId: null }] },
            select: { category: true, status: true },
          });

      const categoryMap: Record<string, { count: number; available: number; out_of_stock: number }> = {};
      for (const item of allItems) {
        if (!categoryMap[item.category]) categoryMap[item.category] = { count: 0, available: 0, out_of_stock: 0 };
        categoryMap[item.category].count++;
        if (item.status === 'available') categoryMap[item.category].available++;
        if (item.status === 'out_of_stock') categoryMap[item.category].out_of_stock++;
      }
      const summary = Object.entries(categoryMap).map(([cat, stats]) => ({ category: cat, ...stats }));

      return { items: rows, summary };
    });

    if (result === null) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });
    return Response.json(result);
  } catch (err) {
    console.error('Inventory GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  if (primaryRole.role_code !== 'vendor') return Response.json({ error: 'Only vendors can add inventory items' }, { status: 403 });

  const vendor = await getVendor(user.id);
  if (!vendor) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });

  try {
    const body = await request.json();
    const { name, category, description, price, quantity, unit, school_id, image_url } = body;

    if (!name || !category || !price) return Response.json({ error: 'name, category, and price are required' }, { status: 400 });
    if (!VALID_CATEGORIES.includes(category)) return Response.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });

    const item = await prisma.vendorInventory.create({
      data: {
        vendorId: vendor.id,
        schoolId: school_id || primaryRole.school_id || null,
        name, category,
        description: description || null,
        price: parseFloat(price),
        quantity: parseInt(quantity) || 0,
        unit: unit || 'piece',
        imageUrl: image_url || null,
      },
    });

    await cacheInvalidate(`inventory:vendor:${user.id}:`);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    console.error('Inventory POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  if (primaryRole.role_code !== 'vendor') return Response.json({ error: 'Only vendors can update inventory items' }, { status: 403 });

  const vendor = await getVendor(user.id);
  if (!vendor) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });

  try {
    const body = await request.json();
    const { id, name, category, description, price, quantity, unit, status, image_url } = body;

    if (!id) return Response.json({ error: 'Item id is required' }, { status: 400 });

    const existing = await prisma.vendorInventory.findFirst({ where: { id, vendorId: vendor.id } });
    if (!existing) return Response.json({ error: 'Item not found or access denied' }, { status: 404 });

    const item = await prisma.vendorInventory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(description !== undefined && { description: description || null }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(unit && { unit }),
        ...(status && { status }),
        ...(image_url !== undefined && { imageUrl: image_url || null }),
      },
    });

    await cacheInvalidate(`inventory:vendor:${user.id}:`);
    return Response.json({ item });
  } catch (err) {
    console.error('Inventory PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  if (primaryRole.role_code !== 'vendor') return Response.json({ error: 'Only vendors can delete inventory items' }, { status: 403 });

  const vendor = await getVendor(user.id);
  if (!vendor) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  try {
    const existing = await prisma.vendorInventory.findFirst({ where: { id, vendorId: vendor.id } });
    if (!existing) return Response.json({ error: 'Item not found or access denied' }, { status: 404 });

    await prisma.vendorInventory.delete({ where: { id } });
    await cacheInvalidate(`inventory:vendor:${user.id}:`);
    return Response.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Inventory DELETE error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
