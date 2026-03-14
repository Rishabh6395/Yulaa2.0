import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find(r => r.is_primary) || user.roles[0];
  const schoolId = primaryRole.school_id;

  try {
    const result = await query(
      `SELECT t.id, t.employee_id, t.subjects, t.qualification, t.joining_date, t.status,
              u.first_name, u.last_name, u.email, u.phone, u.avatar_url
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.school_id = $1
       ORDER BY u.first_name, u.last_name`,
      [schoolId]
    );

    return Response.json({ teachers: result.rows });
  } catch (err) {
    console.error('Teachers GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
