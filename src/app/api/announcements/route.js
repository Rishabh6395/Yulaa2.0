import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const result = await query(
      `SELECT a.id, a.title, a.message, a.type, a.audience, a.published_at, a.expires_at,
              u.first_name || ' ' || u.last_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.school_id = $1
       ORDER BY a.published_at DESC
       LIMIT 50`,
      [schoolId]
    );

    return Response.json({ announcements: result.rows });
  } catch (err) {
    console.error('Announcements GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const body = await request.json();
    const { title, message, type, audience, expires_at } = body;

    if (!title || !message) {
      return Response.json({ error: 'title and message are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO announcements (school_id, title, message, type, audience, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [schoolId, title, message, type || 'general', audience || 'all', expires_at || null, user.id]
    );

    return Response.json({ announcement: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Announcements POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
