import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  const status = searchParams.get('status');

  try {
    let where = 'WHERE h.school_id = $1';
    const params = [schoolId];
    let idx = 2;

    if (classId) { where += ` AND h.class_id = $${idx++}`; params.push(classId); }
    if (status) { where += ` AND h.status = $${idx++}`; params.push(status); }

    const result = await query(
      `SELECT h.id, h.subject, h.title, h.description, h.due_date, h.status, h.created_at,
              c.grade, c.section,
              u.first_name || ' ' || u.last_name as teacher_name,
              (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.status = 'submitted') as submissions,
              (SELECT COUNT(*) FROM students st WHERE st.class_id = h.class_id AND st.admission_status = 'approved') as total_students
       FROM homework h
       JOIN classes c ON c.id = h.class_id
       JOIN teachers t ON t.id = h.teacher_id
       JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY h.due_date DESC`,
      params
    );

    return Response.json({ homework: result.rows });
  } catch (err) {
    console.error('Homework GET error:', err);
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
    const { class_id, subject, title, description, due_date } = body;

    if (!class_id || !subject || !title || !due_date) {
      return Response.json({ error: 'class_id, subject, title, and due_date are required' }, { status: 400 });
    }

    // Get teacher record
    const teacherRes = await query(
      `SELECT t.id FROM teachers t WHERE t.user_id = $1 AND t.school_id = $2`,
      [user.id, schoolId]
    );

    const teacherId = teacherRes.rows.length > 0 ? teacherRes.rows[0].id : null;
    if (!teacherId) {
      return Response.json({ error: 'Teacher record not found' }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO homework (school_id, class_id, teacher_id, subject, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [schoolId, class_id, teacherId, subject, title, description || null, due_date]
    );

    return Response.json({ homework: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Homework POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
