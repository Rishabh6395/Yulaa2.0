import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

async function getConsultant(userId) {
  const res = await query('SELECT id FROM consultants WHERE user_id = $1', [userId]);
  return res.rows[0] || null;
}

// GET /api/consultant/sessions
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const isConsultant = primaryRole.role_code === 'consultant';
  const isAdmin = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

  if (!isConsultant && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  try {
    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (isConsultant) {
      const consultant = await getConsultant(user.id);
      if (!consultant) return Response.json({ error: 'Consultant profile not found' }, { status: 404 });
      where += ` AND cs.consultant_id = $${idx++}`;
      params.push(consultant.id);
    } else {
      where += ` AND cs.school_id = $${idx++}`;
      params.push(primaryRole.school_id);
    }

    if (statusFilter) {
      where += ` AND cs.status = $${idx++}`;
      params.push(statusFilter);
    }

    const result = await query(
      `SELECT cs.id, cs.title, cs.description, cs.session_type, cs.target_grades,
              cs.session_date, cs.duration_minutes, cs.max_participants,
              cs.status, cs.meeting_link, cs.created_at,
              u.first_name || ' ' || u.last_name as consultant_name,
              c.specialization,
              sch.name as school_name
       FROM consultant_sessions cs
       JOIN consultants c ON c.id = cs.consultant_id
       JOIN users u ON u.id = c.user_id
       JOIN schools sch ON sch.id = cs.school_id
       ${where}
       ORDER BY cs.session_date DESC NULLS LAST`,
      params
    );

    return Response.json({ sessions: result.rows });
  } catch (err) {
    console.error('Sessions GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/consultant/sessions — consultant creates a session
export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  if (primaryRole.role_code !== 'consultant') {
    return Response.json({ error: 'Only consultants can create sessions' }, { status: 403 });
  }

  const consultant = await getConsultant(user.id);
  if (!consultant) return Response.json({ error: 'Consultant profile not found' }, { status: 404 });

  try {
    const body = await request.json();
    const {
      title, description, session_type, target_grades,
      session_date, duration_minutes, max_participants, meeting_link,
    } = body;

    if (!title || !session_type) {
      return Response.json({ error: 'title and session_type are required' }, { status: 400 });
    }

    // Verify consultant has an active contract with this school
    const contractCheck = await query(
      `SELECT id FROM consultant_contracts
       WHERE consultant_id = $1 AND school_id = $2
         AND status = 'active' AND end_date >= CURRENT_DATE`,
      [consultant.id, primaryRole.school_id]
    );
    if (contractCheck.rows.length === 0) {
      return Response.json({ error: 'No active contract with this school' }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO consultant_sessions
         (consultant_id, school_id, title, description, session_type, target_grades,
          session_date, duration_minutes, max_participants, meeting_link, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled')
       RETURNING *`,
      [
        consultant.id, primaryRole.school_id, title, description || null,
        session_type, target_grades || [],
        session_date || null, duration_minutes || 60,
        max_participants || null, meeting_link || null,
      ]
    );

    return Response.json({ session: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Sessions POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/consultant/sessions — update session status or details
export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  if (primaryRole.role_code !== 'consultant') {
    return Response.json({ error: 'Only consultants can update sessions' }, { status: 403 });
  }

  const consultant = await getConsultant(user.id);
  if (!consultant) return Response.json({ error: 'Consultant profile not found' }, { status: 404 });

  try {
    const body = await request.json();
    const { id, title, description, session_type, target_grades, session_date,
            duration_minutes, max_participants, meeting_link, status } = body;

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const check = await query(
      'SELECT id FROM consultant_sessions WHERE id = $1 AND consultant_id = $2',
      [id, consultant.id]
    );
    if (check.rows.length === 0) {
      return Response.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    const result = await query(
      `UPDATE consultant_sessions
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           session_type = COALESCE($3, session_type),
           target_grades = COALESCE($4, target_grades),
           session_date = COALESCE($5, session_date),
           duration_minutes = COALESCE($6, duration_minutes),
           max_participants = COALESCE($7, max_participants),
           meeting_link = COALESCE($8, meeting_link),
           status = COALESCE($9, status)
       WHERE id = $10 AND consultant_id = $11
       RETURNING *`,
      [title, description, session_type, target_grades, session_date,
       duration_minutes, max_participants, meeting_link, status, id, consultant.id]
    );

    return Response.json({ session: result.rows[0] });
  } catch (err) {
    console.error('Sessions PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
