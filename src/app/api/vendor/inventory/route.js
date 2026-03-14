import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Helper: get vendor record for the logged-in user
async function getVendor(userId) {
  const res = await query('SELECT id FROM vendors WHERE user_id = $1', [userId]);
  return res.rows[0] || null;
}

// GET /api/vendor/inventory
// - Vendor: returns only their own items (optionally filtered by school_id, category, status)
// - Admin/super_admin: returns all vendor items for their school
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const status   = searchParams.get('status');

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const isVendor = primaryRole.role_code === 'vendor';
  const isAdmin  = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

  try {
    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (isVendor) {
      const vendor = await getVendor(user.id);
      if (!vendor) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });
      where += ` AND vi.vendor_id = $${idx++}`;
      params.push(vendor.id);
    } else if (isAdmin) {
      where += ` AND (vi.school_id = $${idx++} OR vi.school_id IS NULL)`;
      params.push(primaryRole.school_id);
    } else {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (category) { where += ` AND vi.category = $${idx++}`; params.push(category); }
    if (status)   { where += ` AND vi.status = $${idx++}`;   params.push(status); }

    const result = await query(
      `SELECT vi.id, vi.name, vi.category, vi.description, vi.price, vi.quantity,
              vi.unit, vi.image_url, vi.status, vi.created_at, vi.updated_at,
              v.company_name as vendor_name,
              u.first_name || ' ' || u.last_name as vendor_contact,
              sch.name as school_name
       FROM vendor_inventory vi
       JOIN vendors v ON v.id = vi.vendor_id
       JOIN users u ON u.id = v.user_id
       LEFT JOIN schools sch ON sch.id = vi.school_id
       ${where}
       ORDER BY vi.created_at DESC`,
      params
    );

    // Category summary counts
    const summaryRes = await query(
      `SELECT category, COUNT(*) as count,
              SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
              SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
       FROM vendor_inventory vi
       ${isVendor ? `JOIN vendors v ON v.id = vi.vendor_id AND v.user_id = $1` : `WHERE (vi.school_id = $1 OR vi.school_id IS NULL)`}
       ${isVendor ? 'WHERE' : 'AND'} 1=1
       GROUP BY category`,
      [isVendor ? (await getVendor(user.id))?.id : primaryRole.school_id]
    );

    return Response.json({ items: result.rows, summary: summaryRes.rows });
  } catch (err) {
    console.error('Inventory GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/vendor/inventory — vendor adds a new item
export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  if (primaryRole.role_code !== 'vendor') {
    return Response.json({ error: 'Only vendors can add inventory items' }, { status: 403 });
  }

  const vendor = await getVendor(user.id);
  if (!vendor) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });

  try {
    const body = await request.json();
    const { name, category, description, price, quantity, unit, school_id, image_url } = body;

    if (!name || !category || !price) {
      return Response.json({ error: 'name, category, and price are required' }, { status: 400 });
    }

    const validCategories = ['books', 'uniform', 'lanyard', 'stationery', 'sports', 'other'];
    if (!validCategories.includes(category)) {
      return Response.json({ error: `category must be one of: ${validCategories.join(', ')}` }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO vendor_inventory (vendor_id, school_id, name, category, description, price, quantity, unit, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [vendor.id, school_id || primaryRole.school_id, name, category, description || null,
       parseFloat(price), parseInt(quantity) || 0, unit || 'piece', image_url || null]
    );

    return Response.json({ item: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Inventory POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/vendor/inventory — vendor updates their item
export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  if (primaryRole.role_code !== 'vendor') {
    return Response.json({ error: 'Only vendors can update inventory items' }, { status: 403 });
  }

  const vendor = await getVendor(user.id);
  if (!vendor) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });

  try {
    const body = await request.json();
    const { id, name, category, description, price, quantity, unit, status, image_url } = body;

    if (!id) return Response.json({ error: 'Item id is required' }, { status: 400 });

    // Ensure item belongs to this vendor
    const check = await query(
      'SELECT id FROM vendor_inventory WHERE id = $1 AND vendor_id = $2',
      [id, vendor.id]
    );
    if (check.rows.length === 0) {
      return Response.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    const result = await query(
      `UPDATE vendor_inventory
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           quantity = COALESCE($5, quantity),
           unit = COALESCE($6, unit),
           status = COALESCE($7, status),
           image_url = COALESCE($8, image_url),
           updated_at = NOW()
       WHERE id = $9 AND vendor_id = $10
       RETURNING *`,
      [name, category, description, price ? parseFloat(price) : null,
       quantity !== undefined ? parseInt(quantity) : null,
       unit, status, image_url, id, vendor.id]
    );

    return Response.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Inventory PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/vendor/inventory?id=...
export async function DELETE(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  if (primaryRole.role_code !== 'vendor') {
    return Response.json({ error: 'Only vendors can delete inventory items' }, { status: 403 });
  }

  const vendor = await getVendor(user.id);
  if (!vendor) return Response.json({ error: 'Vendor profile not found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  try {
    const result = await query(
      'DELETE FROM vendor_inventory WHERE id = $1 AND vendor_id = $2 RETURNING id',
      [id, vendor.id]
    );
    if (result.rows.length === 0) {
      return Response.json({ error: 'Item not found or access denied' }, { status: 404 });
    }
    return Response.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Inventory DELETE error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
