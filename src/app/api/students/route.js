import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const classId = searchParams.get('class_id');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    let where = 'WHERE s.school_id = $1';
    const params = [schoolId];
    let paramIdx = 2;

    if (status) {
      where += ` AND s.admission_status = $${paramIdx++}`;
      params.push(status);
    }
    if (classId) {
      where += ` AND s.class_id = $${paramIdx++}`;
      params.push(classId);
    }
    if (search) {
      where += ` AND (s.first_name ILIKE $${paramIdx} OR s.last_name ILIKE $${paramIdx} OR s.admission_no ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countRes = await query(`SELECT COUNT(*) FROM students s ${where}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.dob, s.gender,
              s.admission_status, s.admission_date, s.photo_url, s.address,
              c.grade, c.section, c.id as class_id,
              (SELECT json_agg(json_build_object('name', u.first_name || ' ' || u.last_name, 'phone', u.phone, 'email', u.email))
               FROM parent_students ps JOIN parents p ON p.id = ps.parent_id JOIN users u ON u.id = p.user_id
               WHERE ps.student_id = s.id) as parents
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    );

    return Response.json({
      students: result.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('Students GET error:', err);
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
    const { admission_no, first_name, last_name, dob, gender, class_id, address, blood_group, medical_notes } = body;

    if (!admission_no || !first_name || !last_name) {
      return Response.json({ error: 'Required fields: admission_no, first_name, last_name' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO students (school_id, class_id, admission_no, first_name, last_name, dob, gender, address, blood_group, medical_notes, admission_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [schoolId, class_id || null, admission_no, first_name, last_name, dob || null, gender || null, address || null, blood_group || null, medical_notes || null]
    );

    return Response.json({ student: result.rows[0] }, { status: 201 });
  } catch (err) {
    if (err.code === '23505') {
      return Response.json({ error: 'Admission number already exists for this school' }, { status: 409 });
    }
    console.error('Students POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, admission_status } = body;

    if (!id || !admission_status) {
      return Response.json({ error: 'id and admission_status required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE students SET admission_status = $1, admission_date = CASE WHEN $1 = 'approved' THEN CURRENT_DATE ELSE admission_date END, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [admission_status, id]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }

    return Response.json({ student: result.rows[0] });
  } catch (err) {
    console.error('Students PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
