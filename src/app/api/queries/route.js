import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const result = await query(
      `SELECT q.id, q.subject, q.message, q.status, q.priority, q.created_at, q.resolved_at,
              u.first_name || ' ' || u.last_name as raised_by_name,
              s.first_name || ' ' || s.last_name as student_name,
              au.first_name || ' ' || au.last_name as assigned_to_name,
              (SELECT COUNT(*) FROM query_replies qr WHERE qr.query_id = q.id) as reply_count
       FROM queries q
       JOIN users u ON u.id = q.raised_by
       LEFT JOIN students s ON s.id = q.student_id
       LEFT JOIN users au ON au.id = q.assigned_to
       WHERE q.school_id = $1
       ORDER BY q.created_at DESC
       LIMIT 50`,
      [schoolId]
    );

    return Response.json({ queries: result.rows });
  } catch (err) {
    console.error('Queries GET error:', err);
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
    const { subject, message, student_id, priority } = body;

    const result = await query(
      `INSERT INTO queries (school_id, raised_by, student_id, subject, message, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [schoolId, user.id, student_id || null, subject, message, priority || 'normal']
    );

    return Response.json({ query: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Queries POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
