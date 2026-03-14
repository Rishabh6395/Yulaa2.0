import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const result = await query(
      `SELECT c.id, c.grade, c.section, c.capacity, c.academic_year,
              u.first_name || ' ' || u.last_name as teacher_name,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.admission_status = 'approved') as student_count
       FROM classes c
       LEFT JOIN teachers t ON t.id = c.class_teacher_id
       LEFT JOIN users u ON u.id = t.user_id
       WHERE c.school_id = $1
       ORDER BY c.grade, c.section`,
      [schoolId]
    );

    return Response.json({ classes: result.rows });
  } catch (err) {
    console.error('Classes GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
