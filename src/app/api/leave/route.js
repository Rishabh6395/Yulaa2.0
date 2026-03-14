import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const result = await query(
      `SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status, lr.created_at,
              u.first_name || ' ' || u.last_name as requester_name,
              s.first_name || ' ' || s.last_name as student_name, s.admission_no,
              au.first_name || ' ' || au.last_name as approved_by_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.requester_id
       LEFT JOIN students s ON s.id = lr.student_id
       LEFT JOIN users au ON au.id = lr.approved_by
       WHERE lr.school_id = $1
       ORDER BY lr.created_at DESC
       LIMIT 50`,
      [schoolId]
    );

    return Response.json({ leaves: result.rows });
  } catch (err) {
    console.error('Leave GET error:', err);
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
    const { student_id, leave_type, start_date, end_date, reason } = body;

    const result = await query(
      `INSERT INTO leave_requests (school_id, requester_id, student_id, leave_type, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [schoolId, user.id, student_id || null, leave_type || 'personal', start_date, end_date, reason || null]
    );

    return Response.json({ leave: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Leave POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status } = await request.json();
    const result = await query(
      `UPDATE leave_requests SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *`,
      [status, user.id, id]
    );
    return Response.json({ leave: result.rows[0] });
  } catch (err) {
    console.error('Leave PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
