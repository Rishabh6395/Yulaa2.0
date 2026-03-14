import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const classId = searchParams.get('class_id');
  const studentId = searchParams.get('student_id');
  const month = searchParams.get('month'); // YYYY-MM format

  try {
    // If requesting monthly data for a student (calendar view)
    if (studentId && month) {
      const result = await query(
        `SELECT date, status FROM attendance
         WHERE student_id = $1 AND to_char(date, 'YYYY-MM') = $2
         ORDER BY date`,
        [studentId, month]
      );
      return Response.json({ attendance: result.rows });
    }

    // Class attendance for a specific date
    if (classId) {
      const result = await query(
        `SELECT s.id as student_id, s.first_name, s.last_name, s.admission_no,
                a.status, a.remarks, a.id as attendance_id
         FROM students s
         LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2
         WHERE s.class_id = $1 AND s.admission_status = 'approved'
         ORDER BY s.first_name, s.last_name`,
        [classId, date]
      );
      return Response.json({ students: result.rows, date });
    }

    // Summary for a date
    const result = await query(
      `SELECT c.id as class_id, c.grade, c.section,
              COUNT(a.id) FILTER (WHERE a.status = 'present') as present,
              COUNT(a.id) FILTER (WHERE a.status = 'absent') as absent,
              COUNT(a.id) FILTER (WHERE a.status = 'late') as late,
              COUNT(a.id) as total
       FROM classes c
       LEFT JOIN attendance a ON a.class_id = c.id AND a.date = $2
       WHERE c.school_id = $1
       GROUP BY c.id, c.grade, c.section
       ORDER BY c.grade, c.section`,
      [schoolId, date]
    );

    return Response.json({ classes: result.rows, date });
  } catch (err) {
    console.error('Attendance GET error:', err);
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
    const { records, date, class_id } = body;

    if (!records || !Array.isArray(records) || !date || !class_id) {
      return Response.json({ error: 'records array, date, and class_id required' }, { status: 400 });
    }

    let inserted = 0;
    for (const record of records) {
      await query(
        `INSERT INTO attendance (school_id, student_id, class_id, date, status, marked_by, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, date) DO UPDATE SET status = $5, marked_by = $6, remarks = $7`,
        [schoolId, record.student_id, class_id, date, record.status, user.id, record.remarks || null]
      );
      inserted++;
    }

    return Response.json({ message: `Attendance marked for ${inserted} students`, date });
  } catch (err) {
    console.error('Attendance POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
