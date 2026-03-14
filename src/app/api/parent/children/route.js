import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const isParent = user.roles.some(r => r.role_code === 'parent');
  if (!isParent) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await query(
      `SELECT
         s.id, s.first_name, s.last_name, s.admission_no, s.photo_url,
         s.school_id, sch.name as school_name,
         s.class_id, c.grade, c.section,
         ps.relationship, ps.is_primary as is_primary_child
       FROM parent_students ps
       JOIN parents p ON p.id = ps.parent_id
       JOIN students s ON s.id = ps.student_id
       JOIN schools sch ON sch.id = s.school_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE p.user_id = $1
       ORDER BY ps.is_primary DESC, s.first_name`,
      [user.id]
    );

    return Response.json({ children: result.rows });
  } catch (err) {
    console.error('Parent children error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
